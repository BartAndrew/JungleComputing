use std::{
    convert::Infallible,
    env,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::Duration,
};

use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{
        sse::{Event, KeepAlive},
        Html, IntoResponse, Response, Sse,
    },
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use tokio::sync::broadcast;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{error, info};
use uuid::Uuid;

const CANOPY_HTML: &str = include_str!("../../canopy/index.html");

#[derive(Clone)]
struct AppState {
    db: PgPool,
    events: broadcast::Sender<PlatformEvent>,
    metrics: Arc<Metrics>,
}

#[derive(Default)]
struct Metrics {
    requests_total: AtomicU64,
    registrations_total: AtomicU64,
    heartbeats_total: AtomicU64,
    errors_total: AtomicU64,
}

#[derive(Debug, Serialize, Clone)]
struct NodeManifest {
    id: Uuid,
    name: String,
    node_type: String,
    environment: String,
    city: Option<String>,
    island: Option<String>,
    version: String,
    capabilities: Vec<String>,
    status: String,
    cpu_percent: Option<f64>,
    memory_percent: Option<f64>,
    metadata: Value,
    last_seen_at: DateTime<Utc>,
    registered_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct RegisterNode {
    id: Option<Uuid>,
    name: String,
    node_type: String,
    environment: Option<String>,
    city: Option<String>,
    island: Option<String>,
    version: Option<String>,
    capabilities: Option<Vec<String>>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct Heartbeat {
    status: Option<String>,
    cpu_percent: Option<f64>,
    memory_percent: Option<f64>,
    metadata: Option<Value>,
}

#[derive(Debug, Serialize, Clone)]
struct PlatformEvent {
    id: Uuid,
    event_type: String,
    source: String,
    subject: Option<String>,
    occurred_at: DateTime<Utc>,
    data: Value,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://jungle:jungle@localhost:5432/jungle".to_string());
    let bind = env::var("JUNGLE_BIND").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    let db = connect_with_retry(&database_url).await?;
    migrate(&db).await?;

    let (events, _) = broadcast::channel(512);
    let state = AppState {
        db,
        events,
        metrics: Arc::new(Metrics::default()),
    };

    spawn_stale_node_sweeper(state.clone());

    let app = Router::new()
        .route("/", get(canopy))
        .route("/healthz", get(healthz))
        .route("/metrics", get(metrics))
        .route("/api/nodes", get(list_nodes).post(register_node))
        .route("/api/nodes/{id}", get(get_node))
        .route("/api/nodes/{id}/heartbeat", post(heartbeat))
        .route("/api/events", get(event_stream))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind).await?;
    info!(%bind, "Jungle Registry listening");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn connect_with_retry(database_url: &str) -> anyhow::Result<PgPool> {
    for attempt in 1..=30 {
        match PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await
        {
            Ok(pool) => return Ok(pool),
            Err(err) if attempt < 30 => {
                error!(attempt, error = %err, "database unavailable; retrying");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
            Err(err) => return Err(err.into()),
        }
    }
    unreachable!()
}

async fn migrate(db: &PgPool) -> anyhow::Result<()> {
    sqlx::raw_sql(
        r#"
        CREATE TABLE IF NOT EXISTS jungle_nodes (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            node_type TEXT NOT NULL,
            environment TEXT NOT NULL,
            city TEXT NULL,
            island TEXT NULL,
            version TEXT NOT NULL,
            capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
            status TEXT NOT NULL DEFAULT 'online',
            cpu_percent DOUBLE PRECISION NULL,
            memory_percent DOUBLE PRECISION NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_seen_at TIMESTAMPTZ NOT NULL,
            registered_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS jungle_nodes_last_seen_idx ON jungle_nodes(last_seen_at);
        "#,
    )
    .execute(db)
    .await?;
    Ok(())
}

async fn canopy(State(state): State<AppState>) -> Html<&'static str> {
    bump_requests(&state);
    Html(CANOPY_HTML)
}

async fn healthz(State(state): State<AppState>) -> Response {
    bump_requests(&state);
    match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => (StatusCode::OK, Json(json!({"status":"ok"}))).into_response(),
        Err(err) => {
            state.metrics.errors_total.fetch_add(1, Ordering::Relaxed);
            error!(error = %err, "health check failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"status":"degraded","database":"unavailable"})),
            )
                .into_response()
        }
    }
}

async fn list_nodes(State(state): State<AppState>) -> Result<Json<Vec<NodeManifest>>, ApiError> {
    bump_requests(&state);
    let rows = sqlx::query(
        "SELECT id,name,node_type,environment,city,island,version,capabilities,status,cpu_percent,memory_percent,metadata,last_seen_at,registered_at FROM jungle_nodes ORDER BY name",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows.into_iter().map(row_to_node).collect()))
}

async fn get_node(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<NodeManifest>, ApiError> {
    bump_requests(&state);
    Ok(Json(fetch_node(&state.db, id).await?))
}

async fn register_node(
    State(state): State<AppState>,
    Json(input): Json<RegisterNode>,
) -> Result<(StatusCode, Json<NodeManifest>), ApiError> {
    bump_requests(&state);
    let id = input.id.unwrap_or_else(Uuid::new_v4);
    let now = Utc::now();
    let name = input.name.clone();
    let capabilities = serde_json::to_value(input.capabilities.unwrap_or_default())?;
    let metadata = input.metadata.unwrap_or_else(|| json!({}));

    sqlx::query(
        r#"
        INSERT INTO jungle_nodes
          (id,name,node_type,environment,city,island,version,capabilities,status,metadata,last_seen_at,registered_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'online',$9,$10,$10)
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name,
          node_type=EXCLUDED.node_type,
          environment=EXCLUDED.environment,
          city=EXCLUDED.city,
          island=EXCLUDED.island,
          version=EXCLUDED.version,
          capabilities=EXCLUDED.capabilities,
          status='online',
          metadata=EXCLUDED.metadata,
          last_seen_at=EXCLUDED.last_seen_at
        "#,
    )
    .bind(id)
    .bind(input.name)
    .bind(input.node_type)
    .bind(input.environment.unwrap_or_else(|| "development".to_string()))
    .bind(input.city)
    .bind(input.island)
    .bind(input.version.unwrap_or_else(|| "0.1.0".to_string()))
    .bind(capabilities)
    .bind(metadata)
    .bind(now)
    .execute(&state.db)
    .await?;

    state
        .metrics
        .registrations_total
        .fetch_add(1, Ordering::Relaxed);
    emit(
        &state,
        "node.registered",
        Some(id.to_string()),
        json!({"name": name}),
    );
    Ok((StatusCode::CREATED, Json(fetch_node(&state.db, id).await?)))
}

async fn heartbeat(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(input): Json<Heartbeat>,
) -> Result<Json<NodeManifest>, ApiError> {
    bump_requests(&state);
    let status = input.status.unwrap_or_else(|| "online".to_string());
    let result = sqlx::query(
        r#"
        UPDATE jungle_nodes
        SET status=$2,cpu_percent=$3,memory_percent=$4,
            metadata=COALESCE($5,metadata),last_seen_at=$6
        WHERE id=$1
        "#,
    )
    .bind(id)
    .bind(&status)
    .bind(input.cpu_percent)
    .bind(input.memory_percent)
    .bind(input.metadata)
    .bind(Utc::now())
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    state
        .metrics
        .heartbeats_total
        .fetch_add(1, Ordering::Relaxed);
    emit(
        &state,
        "node.heartbeat",
        Some(id.to_string()),
        json!({"status": status}),
    );
    Ok(Json(fetch_node(&state.db, id).await?))
}

async fn fetch_node(db: &PgPool, id: Uuid) -> Result<NodeManifest, ApiError> {
    let row = sqlx::query(
        "SELECT id,name,node_type,environment,city,island,version,capabilities,status,cpu_percent,memory_percent,metadata,last_seen_at,registered_at FROM jungle_nodes WHERE id=$1",
    )
    .bind(id)
    .fetch_optional(db)
    .await?;
    row.map(row_to_node).ok_or(ApiError::NotFound)
}

fn row_to_node(row: sqlx::postgres::PgRow) -> NodeManifest {
    NodeManifest {
        id: row.get("id"),
        name: row.get("name"),
        node_type: row.get("node_type"),
        environment: row.get("environment"),
        city: row.get("city"),
        island: row.get("island"),
        version: row.get("version"),
        capabilities: serde_json::from_value(row.get("capabilities")).unwrap_or_default(),
        status: row.get("status"),
        cpu_percent: row.get("cpu_percent"),
        memory_percent: row.get("memory_percent"),
        metadata: row.get("metadata"),
        last_seen_at: row.get("last_seen_at"),
        registered_at: row.get("registered_at"),
    }
}

async fn event_stream(
    State(state): State<AppState>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    bump_requests(&state);
    let stream = BroadcastStream::new(state.events.subscribe()).filter_map(|item| match item {
        Ok(event) => {
            let event_name = event.event_type.clone();
            let sse = Event::default()
                .event(event_name)
                .json_data(event)
                .unwrap_or_else(|_| Event::default().data("{}"));
            Some(Ok::<Event, Infallible>(sse))
        }
        Err(_) => None,
    });
    Sse::new(stream).keep_alive(KeepAlive::default())
}

fn emit(state: &AppState, event_type: &str, subject: Option<String>, data: Value) {
    let _ = state.events.send(PlatformEvent {
        id: Uuid::new_v4(),
        event_type: event_type.to_string(),
        source: "jungle-registry".to_string(),
        subject,
        occurred_at: Utc::now(),
        data,
    });
}

fn spawn_stale_node_sweeper(state: AppState) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(10));
        loop {
            interval.tick().await;
            match sqlx::query(
                "UPDATE jungle_nodes SET status='offline' WHERE status <> 'offline' AND last_seen_at < NOW() - INTERVAL '20 seconds' RETURNING id,name",
            )
            .fetch_all(&state.db)
            .await
            {
                Ok(rows) => {
                    for row in rows {
                        let id: Uuid = row.get("id");
                        let name: String = row.get("name");
                        emit(
                            &state,
                            "node.health_changed",
                            Some(id.to_string()),
                            json!({"name":name,"status":"offline"}),
                        );
                    }
                }
                Err(err) => error!(error = %err, "stale-node sweep failed"),
            }
        }
    });
}

async fn metrics(State(state): State<AppState>) -> Response {
    bump_requests(&state);
    let rows = sqlx::query(
        "SELECT status, COUNT(*)::BIGINT AS count FROM jungle_nodes GROUP BY status",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let mut body = String::new();
    metric_counter(
        &mut body,
        "jungle_registry_requests_total",
        "HTTP requests handled by the registry",
        state.metrics.requests_total.load(Ordering::Relaxed),
    );
    metric_counter(
        &mut body,
        "jungle_registry_registrations_total",
        "Node registrations",
        state.metrics.registrations_total.load(Ordering::Relaxed),
    );
    metric_counter(
        &mut body,
        "jungle_registry_heartbeats_total",
        "Node heartbeats",
        state.metrics.heartbeats_total.load(Ordering::Relaxed),
    );
    metric_counter(
        &mut body,
        "jungle_registry_errors_total",
        "Registry errors",
        state.metrics.errors_total.load(Ordering::Relaxed),
    );
    body.push_str("# HELP jungle_nodes Current Jungle nodes by status\n# TYPE jungle_nodes gauge\n");
    for row in rows {
        let status: String = row.get("status");
        let count: i64 = row.get("count");
        body.push_str(&format!(
            "jungle_nodes{{status=\"{}\"}} {}\n",
            status, count
        ));
    }

    (
        [(header::CONTENT_TYPE, "text/plain; version=0.0.4")],
        body,
    )
        .into_response()
}

fn metric_counter(body: &mut String, name: &str, help: &str, value: u64) {
    body.push_str(&format!(
        "# HELP {name} {help}\n# TYPE {name} counter\n{name} {value}\n"
    ));
}

fn bump_requests(state: &AppState) {
    state.metrics.requests_total.fetch_add(1, Ordering::Relaxed);
}

#[derive(Debug)]
enum ApiError {
    NotFound,
    Database(sqlx::Error),
    Json(serde_json::Error),
}

impl From<sqlx::Error> for ApiError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value)
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            Self::NotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({"error":"not_found"})),
            )
                .into_response(),
            Self::Database(err) => {
                error!(error = %err, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error":"database_error"})),
                )
                    .into_response()
            }
            Self::Json(err) => {
                error!(error = %err, "serialization error");
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error":"invalid_json"})),
                )
                    .into_response()
            }
        }
    }
}
