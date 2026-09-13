//! Local-development Jungle registry and observation gateway.
//! Production identity and tenant isolation are intentionally not implied.
mod applications;

use std::{convert::Infallible, env, sync::{atomic::{AtomicU64, Ordering}, Arc}, time::Duration};
use axum::{extract::{DefaultBodyLimit, Path, Request, State}, http::{header, StatusCode}, middleware::{self, Next}, response::{sse::{Event, KeepAlive}, Html, IntoResponse, Response, Sse}, routing::{get, post}, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use tokio::sync::broadcast;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};
use tracing::{error, info};
use uuid::Uuid;

const CANOPY_HTML: &str = include_str!("../../canopy/index.html");
#[derive(Clone)]
struct AppState { db: PgPool, events: broadcast::Sender<PlatformEvent>, metrics: Arc<Metrics> }
#[derive(Default)]
struct Metrics { requests: AtomicU64, errors: AtomicU64, registrations: AtomicU64, heartbeats: AtomicU64 }
#[derive(Debug, Serialize, Clone)]
struct NodeManifest {
    id: Uuid, name: String, node_type: String, environment: String,
    city: Option<String>, island: Option<String>, version: String, capabilities: Vec<String>,
    status: String, cpu_percent: Option<f64>, memory_percent: Option<f64>, metadata: Value,
    last_seen_at: DateTime<Utc>, registered_at: DateTime<Utc>,
}
#[derive(Deserialize)]
struct RegisterNode {
    id: Option<Uuid>, name: String, node_type: String, environment: Option<String>,
    city: Option<String>, island: Option<String>, version: Option<String>,
    capabilities: Option<Vec<String>>, metadata: Option<Value>,
}
#[derive(Deserialize)]
struct Heartbeat { status: Option<String>, cpu_percent: Option<f64>, memory_percent: Option<f64>, metadata: Option<Value> }
#[derive(Debug, Serialize, Clone)]
struct PlatformEvent { id: Uuid, event_type: String, source: String, subject: Option<String>, occurred_at: DateTime<Utc>, data: Value }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().json().with_env_filter(tracing_subscriber::EnvFilter::from_default_env()).init();
    anyhow::ensure!(env::var("JUNGLE_DEV_MODE").as_deref() == Ok("true"), "Set JUNGLE_DEV_MODE=true for this local-only reference stack");
    let db = PgPoolOptions::new().max_connections(10).acquire_timeout(Duration::from_secs(3)).connect(&env::var("DATABASE_URL")?).await?;
    sqlx::raw_sql(r#"
        CREATE TABLE IF NOT EXISTS jungle_nodes (
            id UUID PRIMARY KEY, name TEXT NOT NULL, node_type TEXT NOT NULL,
            environment TEXT NOT NULL, city TEXT, island TEXT, version TEXT NOT NULL,
            capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
            status TEXT NOT NULL DEFAULT 'online', cpu_percent DOUBLE PRECISION,
            memory_percent DOUBLE PRECISION, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_seen_at TIMESTAMPTZ NOT NULL, registered_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS jungle_nodes_last_seen_idx ON jungle_nodes(last_seen_at);
    "#).execute(&db).await?;
    applications::migrate(&db).await?;
    let (events, _) = broadcast::channel(512);
    let state = AppState { db, events, metrics: Arc::new(Metrics::default()) };
    sweep(state.clone());
    let app = Router::new()
        .route("/", get(|| async { Html(CANOPY_HTML) }))
        .route("/ui.css", get(|| async { ([(header::CONTENT_TYPE, "text/css; charset=utf-8")], include_str!("../../canopy/ui.css")) }))
        .route("/ui.js", get(|| async { ([(header::CONTENT_TYPE, "application/javascript; charset=utf-8")], include_str!("../../canopy/ui.js")) }))
        .route("/healthz", get(healthz)).route("/metrics", get(metrics))
        .route("/api/nodes", get(list_nodes).post(register_node))
        .route("/api/nodes/{id}", get(get_node))
        .route("/api/nodes/{id}/heartbeat", post(heartbeat))
        .route("/api/events", get(event_stream))
        .merge(applications::routes())
        .layer(DefaultBodyLimit::max(16 * 1024))
        .layer(middleware::from_fn_with_state(state.clone(), guard))
        .with_state(state);
    let bind = env::var("JUNGLE_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    info!(%bind, "Jungle development registry ready");
    axum::serve(listener, app).with_graceful_shutdown(async { let _ = tokio::signal::ctrl_c().await; }).await?;
    Ok(())
}

async fn guard(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let host = request.headers().get(header::HOST).and_then(|v| v.to_str().ok()).unwrap_or("");
    let allowed = env::var("JUNGLE_ALLOWED_HOSTS").unwrap_or_else(|_| "localhost:8080,127.0.0.1:8080,[::1]:8080,registry:8080".into());
    if !allowed.split(',').any(|v| v.trim() == host) {
        return (StatusCode::FORBIDDEN, Json(json!({"error":"host_not_allowed"}))).into_response();
    }
    if request.method() != axum::http::Method::GET && request.method() != axum::http::Method::HEAD {
        if let Some(origin) = request.headers().get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
            if origin != format!("http://{host}") && origin != format!("https://{host}") {
                return (StatusCode::FORBIDDEN, Json(json!({"error":"cross_origin_write_denied"}))).into_response();
            }
        }
        if request.headers().get("sec-fetch-site").and_then(|v| v.to_str().ok()) == Some("cross-site") {
            return (StatusCode::FORBIDDEN, Json(json!({"error":"cross_site_write_denied"}))).into_response();
        }
    }
    let mut response = next.run(request).await;
    state.metrics.requests.fetch_add(1, Ordering::Relaxed);
    if response.status().is_server_error() { state.metrics.errors.fetch_add(1, Ordering::Relaxed); }
    response.headers_mut().insert(header::CACHE_CONTROL, axum::http::HeaderValue::from_static("no-store"));
    response.headers_mut().insert("x-content-type-options", axum::http::HeaderValue::from_static("nosniff"));
    response.headers_mut().insert("x-frame-options", axum::http::HeaderValue::from_static("DENY"));
    response
}
async fn healthz(State(s): State<AppState>) -> Result<Json<Value>, ApiError> {
    sqlx::query("SELECT 1").execute(&s.db).await?;
    Ok(Json(json!({"status":"ok","mode":"development"})))
}
async fn list_nodes(State(s): State<AppState>) -> Result<Json<Vec<NodeManifest>>, ApiError> {
    Ok(Json(sqlx::query("SELECT * FROM jungle_nodes ORDER BY name").fetch_all(&s.db).await?.into_iter().map(row_to_node).collect()))
}
async fn get_node(Path(id): Path<Uuid>, State(s): State<AppState>) -> Result<Json<NodeManifest>, ApiError> {
    Ok(Json(fetch_node(&s.db, id).await?))
}
async fn register_node(State(s): State<AppState>, Json(i): Json<RegisterNode>) -> Result<(StatusCode, Json<NodeManifest>), ApiError> {
    if i.name.trim().is_empty() || i.name.len() > 120 || i.node_type.len() > 64 { return Err(ApiError::Invalid); }
    let id = i.id.unwrap_or_else(Uuid::new_v4);
    let name = i.name.clone();
    sqlx::query(r#"INSERT INTO jungle_nodes
        (id,name,node_type,environment,city,island,version,capabilities,status,metadata,last_seen_at,registered_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'online',$9,NOW(),NOW())
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,node_type=EXCLUDED.node_type,
        environment=EXCLUDED.environment,city=EXCLUDED.city,island=EXCLUDED.island,version=EXCLUDED.version,
        capabilities=EXCLUDED.capabilities,status='online',metadata=EXCLUDED.metadata,
        cpu_percent=NULL,memory_percent=NULL,last_seen_at=EXCLUDED.last_seen_at"#)
        .bind(id).bind(i.name).bind(i.node_type).bind(i.environment.unwrap_or_else(|| "development".into()))
        .bind(i.city).bind(i.island).bind(i.version.unwrap_or_else(|| "0.1.0".into()))
        .bind(serde_json::to_value(i.capabilities.unwrap_or_default())?)
        .bind(i.metadata.unwrap_or_else(|| json!({}))).execute(&s.db).await?;
    s.metrics.registrations.fetch_add(1, Ordering::Relaxed);
    emit(&s, "node.registered", Some(id.to_string()), json!({"name":name}));
    Ok((StatusCode::CREATED, Json(fetch_node(&s.db, id).await?)))
}
async fn heartbeat(Path(id): Path<Uuid>, State(s): State<AppState>, Json(i): Json<Heartbeat>) -> Result<Json<NodeManifest>, ApiError> {
    let status = i.status.unwrap_or_else(|| "online".into());
    if !matches!(status.as_str(), "online" | "degraded" | "offline") || [i.cpu_percent, i.memory_percent].iter().flatten().any(|v| !v.is_finite() || *v < 0.0 || *v > 100.0) { return Err(ApiError::Invalid); }
    let result = sqlx::query("UPDATE jungle_nodes SET status=$2,cpu_percent=$3,memory_percent=$4,metadata=COALESCE($5,metadata),last_seen_at=NOW() WHERE id=$1")
        .bind(id).bind(&status).bind(i.cpu_percent).bind(i.memory_percent).bind(i.metadata).execute(&s.db).await?;
    if result.rows_affected() == 0 { return Err(ApiError::NotFound); }
    s.metrics.heartbeats.fetch_add(1, Ordering::Relaxed);
    emit(&s, "node.heartbeat", Some(id.to_string()), json!({"status":status}));
    Ok(Json(fetch_node(&s.db, id).await?))
}
async fn fetch_node(db: &PgPool, id: Uuid) -> Result<NodeManifest, ApiError> {
    sqlx::query("SELECT * FROM jungle_nodes WHERE id=$1").bind(id).fetch_optional(db).await?.map(row_to_node).ok_or(ApiError::NotFound)
}
fn row_to_node(r: sqlx::postgres::PgRow) -> NodeManifest {
    NodeManifest {
        id:r.get("id"), name:r.get("name"), node_type:r.get("node_type"), environment:r.get("environment"),
        city:r.get("city"), island:r.get("island"), version:r.get("version"),
        capabilities:serde_json::from_value(r.get("capabilities")).unwrap_or_default(),
        status:r.get("status"), cpu_percent:r.get("cpu_percent"), memory_percent:r.get("memory_percent"),
        metadata:r.get("metadata"), last_seen_at:r.get("last_seen_at"), registered_at:r.get("registered_at"),
    }
}
async fn event_stream(State(s): State<AppState>) -> Sse<impl tokio_stream::Stream<Item=Result<Event, Infallible>>> {
    let stream = BroadcastStream::new(s.events.subscribe()).map(|item| {
        Ok::<Event, Infallible>(match item {
            Ok(e) => Event::default().id(e.id.to_string()).event(e.event_type.clone()).json_data(e)
                .unwrap_or_else(|_| Event::default().event("stream.reset").data("{}")),
            Err(_) => Event::default().event("stream.reset").data("{}"),
        })
    });
    Sse::new(stream).keep_alive(KeepAlive::default())
}
fn emit(s: &AppState, event_type: &str, subject: Option<String>, data: Value) {
    let _ = s.events.send(PlatformEvent { id:Uuid::new_v4(), event_type:event_type.into(), source:"jungle-registry".into(), subject, occurred_at:Utc::now(), data });
}
fn sweep(s: AppState) {
    tokio::spawn(async move {
        let mut timer = tokio::time::interval(Duration::from_secs(10));
        loop {
            timer.tick().await;
            match sqlx::query("UPDATE jungle_nodes SET status='offline' WHERE status<>'offline' AND last_seen_at<NOW()-INTERVAL '20 seconds' RETURNING id,name").fetch_all(&s.db).await {
                Ok(rows) => for r in rows { let id:Uuid=r.get("id"); let name:String=r.get("name"); emit(&s,"node.health_changed",Some(id.to_string()),json!({"name":name,"status":"offline"})); },
                Err(e) => error!(error=%e,"node sweep failed"),
            }
        }
    });
}
async fn metrics(State(s): State<AppState>) -> Result<Response, ApiError> {
    let rows = sqlx::query("SELECT status,COUNT(*)::BIGINT AS count FROM jungle_nodes GROUP BY status").fetch_all(&s.db).await?;
    let mut body=String::new();
    for (name, value) in [
        ("jungle_registry_requests_total",s.metrics.requests.load(Ordering::Relaxed)),
        ("jungle_registry_errors_total",s.metrics.errors.load(Ordering::Relaxed)),
        ("jungle_registry_registrations_total",s.metrics.registrations.load(Ordering::Relaxed)),
        ("jungle_registry_heartbeats_total",s.metrics.heartbeats.load(Ordering::Relaxed)),
    ] { body.push_str(&format!("# TYPE {name} counter\n{name} {value}\n")); }
    body.push_str("# TYPE jungle_nodes gauge\n");
    for r in rows {
        let status:String=r.get("status"); let count:i64=r.get("count");
        let safe=status.replace('\\',"\\\\").replace('"',"\\\"").replace('\n',"\\n");
        body.push_str(&format!("jungle_nodes{{status=\"{safe}\"}} {count}\n"));
    }
    Ok(([(header::CONTENT_TYPE,"text/plain; version=0.0.4")],body).into_response())
}
#[derive(Debug)]
enum ApiError { NotFound, Invalid, Database(sqlx::Error), Json(serde_json::Error) }
impl From<sqlx::Error> for ApiError { fn from(v: sqlx::Error) -> Self { Self::Database(v) } }
impl From<serde_json::Error> for ApiError { fn from(v: serde_json::Error) -> Self { Self::Json(v) } }
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::NotFound => (StatusCode::NOT_FOUND,"not_found"),
            Self::Invalid => (StatusCode::BAD_REQUEST,"invalid_node_data"),
            Self::Database(e) => { error!(error=%e,"database error"); (StatusCode::SERVICE_UNAVAILABLE,"database_unavailable") },
            Self::Json(e) => { error!(error=%e,"serialization error"); (StatusCode::BAD_REQUEST,"invalid_json") },
        };
        (status,Json(json!({"error":code}))).into_response()
    }
}
