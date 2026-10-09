//! Development reference application, not a production claims or booking system.
//! Case changes and outgoing events commit together. No customer data enters telemetry.
use std::{env, sync::{Arc, atomic::{AtomicU64, Ordering}}, time::{Duration, Instant}};
use axum::{extract::{DefaultBodyLimit, Path, Request, State}, http::{header, HeaderValue, StatusCode}, middleware::{self, Next}, response::{Html, IntoResponse, Response}, routing::{get, post}, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool};
use tracing::{info, warn};
use uuid::Uuid;

const STATUSES: &[&str] = &["new", "assessing", "awaiting_authorisation", "authorised", "in_repair", "quality_check", "completed", "cancelled"];
const BUCKETS: [f64; 7] = [0.005, 0.025, 0.1, 0.5, 1.0, 5.0, f64::INFINITY];
const HTML: &str = include_str!("../index.html");

#[derive(Clone)]
struct App { db: PgPool, client: reqwest::Client, registry: String, token: String, node: Uuid, metrics: Arc<Metrics> }
#[derive(Default)]
struct Metrics { requests: AtomicU64, errors: AtomicU64, latency_us: AtomicU64, buckets: [AtomicU64; 7] }
#[derive(Debug, Serialize, sqlx::FromRow)]
struct Case { id: Uuid, request_id: Uuid, vehicle: String, repairer: String, description: String, status: String, version: i32, created_at: DateTime<Utc>, updated_at: DateTime<Utc> }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateCase { request_id: Uuid, vehicle: String, repairer: String, description: String }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ChangeStatus { status: String, expected_version: i32 }
#[derive(Debug)]
struct ApiError(StatusCode, &'static str);
impl IntoResponse for ApiError {
    fn into_response(self) -> Response { (self.0, Json(json!({"error": self.1}))).into_response() }
}
impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self { warn!(error = %err, "repair database operation failed"); Self(StatusCode::SERVICE_UNAVAILABLE, "database_unavailable") }
}
fn bad(message: &'static str) -> ApiError { ApiError(StatusCode::BAD_REQUEST, message) }
fn conflict(message: &'static str) -> ApiError { ApiError(StatusCode::CONFLICT, message) }
fn validate(input: &CreateCase) -> Result<(), ApiError> {
    for (value, max) in [(&input.vehicle, 120), (&input.repairer, 120), (&input.description, 2000)] {
        if value.trim().is_empty() || value.chars().count() > max || value.chars().any(|c| c.is_control() && c != '\n') {
            return Err(bad("invalid_case_fields"));
        }
    }
    if input.request_id.is_nil() { return Err(bad("invalid_request_id")); }
    Ok(())
}
fn allowed(from: &str, to: &str) -> bool {
    matches!((from, to), ("new", "assessing") | ("assessing", "awaiting_authorisation") | ("awaiting_authorisation", "authorised") | ("authorised", "in_repair") | ("in_repair", "quality_check") | ("quality_check", "completed"))
        || (to == "cancelled" && matches!(from, "new" | "assessing" | "awaiting_authorisation" | "authorised"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().json().with_env_filter(tracing_subscriber::EnvFilter::from_default_env()).init();
    anyhow::ensure!(env::var("JUNGLE_DEV_MODE").as_deref() == Ok("true"), "This reference service requires JUNGLE_DEV_MODE=true; do not use it with production data");
    let token = env::var("JUNGLE_SERVICE_TOKEN")?;
    anyhow::ensure!(token.len() >= 32, "JUNGLE_SERVICE_TOKEN must have at least 32 characters");
    let db = PgPoolOptions::new().max_connections(8).acquire_timeout(Duration::from_secs(3)).connect(&env::var("DATABASE_URL")?).await?;
    sqlx::raw_sql(r#"
        CREATE SCHEMA IF NOT EXISTS repair_network;
        CREATE TABLE IF NOT EXISTS repair_network.cases (
            id UUID PRIMARY KEY, request_id UUID UNIQUE NOT NULL,
            vehicle TEXT NOT NULL, repairer TEXT NOT NULL, description TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('new','assessing','awaiting_authorisation','authorised','in_repair','quality_check','completed','cancelled')),
            version INTEGER NOT NULL CHECK (version > 0), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS repair_network.outbox (
            id UUID PRIMARY KEY, event JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL,
            delivered_at TIMESTAMPTZ, attempts INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS repair_outbox_pending ON repair_network.outbox(created_at) WHERE delivered_at IS NULL;
    "#).execute(&db).await?;
    let app = App {
        db, token, client: reqwest::Client::builder().timeout(Duration::from_secs(4)).redirect(reqwest::redirect::Policy::none()).build()?,
        registry: env::var("JUNGLE_REGISTRY").unwrap_or_else(|_| "http://127.0.0.1:8080".into()).trim_end_matches('/').to_string(),
        // Reuse API-01's stable identity so an existing development database upgrades without a duplicate tower.
        node: Uuid::new_v5(&Uuid::NAMESPACE_DNS, b"jungle-api-01"), metrics: Arc::new(Metrics::default()),
    };
    let api = Router::new()
        .route("/api/repair/cases", get(list_cases).post(create_case))
        .route("/api/repair/cases/{id}", get(get_case))
        .route("/api/repair/cases/{id}/status", post(change_status))
        .route("/api/repair/summary", get(summary))
        .route_layer(middleware::from_fn_with_state(app.clone(), authenticate));
    let router = Router::new().merge(api)
        .route("/", get(|| async { Html(HTML) }))
        .route("/healthz", get(health))
        .route("/metrics", get(metrics))
        .layer(DefaultBodyLimit::max(16 * 1024))
        .layer(middleware::from_fn_with_state(app.clone(), measure))
        .with_state(app.clone());
    let bind = env::var("REPAIR_BIND").unwrap_or_else(|_| "127.0.0.1:8081".into());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    tokio::spawn(announce(app.clone()));
    tokio::spawn(deliver_outbox(app));
    info!(%bind, "Repair Network development service ready");
    axum::serve(listener, router).with_graceful_shutdown(async { let _ = tokio::signal::ctrl_c().await; }).await?;
    Ok(())
}
async fn authenticate(State(app): State<App>, request: Request, next: Next) -> Response {
    if request.headers().get("x-jungle-service-token").and_then(|v| v.to_str().ok()) != Some(app.token.as_str()) {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error":"unauthorised"}))).into_response();
    }
    next.run(request).await
}
async fn measure(State(app): State<App>, request: Request, next: Next) -> Response {
    let start = Instant::now();
    let request_id = Uuid::new_v4();
    let mut response = next.run(request).await;
    let elapsed = start.elapsed();
    app.metrics.requests.fetch_add(1, Ordering::Relaxed);
    if response.status().is_server_error() { app.metrics.errors.fetch_add(1, Ordering::Relaxed); }
    app.metrics.latency_us.fetch_add(elapsed.as_micros().min(u64::MAX as u128) as u64, Ordering::Relaxed);
    for (i, upper) in BUCKETS.iter().enumerate() { if elapsed.as_secs_f64() <= *upper { app.metrics.buckets[i].fetch_add(1, Ordering::Relaxed); } }
    response.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response.headers_mut().insert("x-request-id", HeaderValue::from_str(&request_id.to_string()).unwrap());
    info!(%request_id, status = response.status().as_u16(), duration_us = elapsed.as_micros() as u64, "repair request completed");
    response
}
async fn health(State(app): State<App>) -> Result<Json<Value>, ApiError> {
    sqlx::query("SELECT 1").execute(&app.db).await?;
    Ok(Json(json!({"status":"ok", "service":"repair-network", "mode":"development"})))
}
async fn list_cases(State(app): State<App>) -> Result<Json<Value>, ApiError> {
    // Explicitly bounded working list; the summary includes all persisted cases.
    let cases = sqlx::query_as::<_, Case>("SELECT * FROM repair_network.cases ORDER BY created_at DESC, id DESC LIMIT 100").fetch_all(&app.db).await?;
    Ok(Json(json!({"cases":cases, "limit":100})))
}
async fn get_case(Path(id): Path<Uuid>, State(app): State<App>) -> Result<Json<Case>, ApiError> {
    let case = sqlx::query_as::<_, Case>("SELECT * FROM repair_network.cases WHERE id=$1").bind(id).fetch_optional(&app.db).await?.ok_or(ApiError(StatusCode::NOT_FOUND, "case_not_found"))?;
    Ok(Json(case))
}
async fn create_case(State(app): State<App>, Json(mut input): Json<CreateCase>) -> Result<(StatusCode, Json<Case>), ApiError> {
    validate(&input)?;
    input.vehicle = input.vehicle.trim().into(); input.repairer = input.repairer.trim().into(); input.description = input.description.trim().into();
    let mut tx = app.db.begin().await?;
    let id = Uuid::new_v4();
    let case = sqlx::query_as::<_, Case>("INSERT INTO repair_network.cases(id,request_id,vehicle,repairer,description,status,version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,'new',1,NOW(),NOW()) ON CONFLICT(request_id) DO NOTHING RETURNING *")
        .bind(id).bind(input.request_id).bind(&input.vehicle).bind(&input.repairer).bind(&input.description).fetch_optional(&mut *tx).await?;
    if let Some(case) = case {
        insert_event(&mut tx, &case, "repair_case.created", None).await?;
        tx.commit().await?;
        Ok((StatusCode::CREATED, Json(case)))
    } else {
        let previous = sqlx::query_as::<_, Case>("SELECT * FROM repair_network.cases WHERE request_id=$1").bind(input.request_id).fetch_one(&mut *tx).await?;
        if previous.vehicle != input.vehicle || previous.repairer != input.repairer || previous.description != input.description { return Err(conflict("request_id_reused_with_different_data")); }
        tx.commit().await?;
        Ok((StatusCode::OK, Json(previous)))
    }
}
async fn change_status(Path(id): Path<Uuid>, State(app): State<App>, Json(input): Json<ChangeStatus>) -> Result<Json<Case>, ApiError> {
    if !STATUSES.contains(&input.status.as_str()) || input.expected_version < 1 { return Err(bad("invalid_status_or_version")); }
    let mut tx = app.db.begin().await?;
    let previous = sqlx::query_as::<_, Case>("SELECT * FROM repair_network.cases WHERE id=$1 FOR UPDATE").bind(id).fetch_optional(&mut *tx).await?.ok_or(ApiError(StatusCode::NOT_FOUND, "case_not_found"))?;
    if previous.version != input.expected_version { return Err(conflict("case_changed_refresh_before_retry")); }
    if !allowed(&previous.status, &input.status) { return Err(conflict("invalid_status_transition")); }
    let case = sqlx::query_as::<_, Case>("UPDATE repair_network.cases SET status=$2, version=version+1, updated_at=NOW() WHERE id=$1 RETURNING *").bind(id).bind(input.status).fetch_one(&mut *tx).await?;
    insert_event(&mut tx, &case, "repair_case.status_changed", Some(&previous.status)).await?;
    tx.commit().await?;
    Ok(Json(case))
}
async fn insert_event(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, case: &Case, event_type: &str, from: Option<&str>) -> Result<(), ApiError> {
    let event_id = Uuid::new_v4();
    let event = json!({"id":event_id, "event_type":event_type, "source":"repair-network", "subject":case.id.to_string(), "occurred_at":case.updated_at,
        "data":{"case_id":case.id,"status":case.status,"previous_status":from,"version":case.version}});
    sqlx::query("INSERT INTO repair_network.outbox(id,event,created_at) VALUES($1,$2,NOW())").bind(event_id).bind(event).execute(&mut **tx).await?;
    Ok(())
}
async fn snapshot(db: &PgPool) -> Result<Value, sqlx::Error> {
    let counts: Vec<(String, i64)> = sqlx::query_as("SELECT status,COUNT(*)::BIGINT FROM repair_network.cases GROUP BY status").fetch_all(db).await?;
    let pending: (i64, f64) = sqlx::query_as("SELECT COUNT(*)::BIGINT, COALESCE(EXTRACT(EPOCH FROM NOW()-MIN(created_at)),0)::DOUBLE PRECISION FROM repair_network.outbox WHERE delivered_at IS NULL").fetch_one(db).await?;
    let mut by_status = serde_json::Map::new();
    for status in STATUSES { by_status.insert((*status).into(), json!(0)); }
    let mut total = 0; let mut active = 0;
    for (status, count) in counts { total += count; if status != "completed" && status != "cancelled" { active += count; } by_status.insert(status, json!(count)); }
    Ok(json!({"total_cases":total,"active_cases":active,"by_status":by_status,"pending_events":pending.0,"oldest_pending_seconds":pending.1.max(0.0),"observed_at":Utc::now()}))
}
async fn summary(State(app): State<App>) -> Result<Json<Value>, ApiError> { Ok(Json(snapshot(&app.db).await?)) }
async fn metrics(State(app): State<App>) -> Result<Response, ApiError> {
    let data = snapshot(&app.db).await?; // Do not turn database failures into zeroes.
    let mut body = format!("# HELP repair_network_http_requests_total Completed HTTP requests, including monitoring\n# TYPE repair_network_http_requests_total counter\nrepair_network_http_requests_total {}\n# HELP repair_network_http_errors_total HTTP 5xx responses\n# TYPE repair_network_http_errors_total counter\nrepair_network_http_errors_total {}\n",app.metrics.requests.load(Ordering::Relaxed),app.metrics.errors.load(Ordering::Relaxed));
    body.push_str("# HELP repair_network_cases Persisted cases by current status\n# TYPE repair_network_cases gauge\n");
    for status in STATUSES { body.push_str(&format!("repair_network_cases{{status=\"{status}\"}} {}\n",data["by_status"][status])); }
    for (name,key) in [("repair_network_outbox_pending","pending_events"),("repair_network_outbox_oldest_seconds","oldest_pending_seconds")] { body.push_str(&format!("# HELP {name} Pending application event delivery\n# TYPE {name} gauge\n{name} {}\n",data[key])); }
    body.push_str("# HELP repair_network_http_duration_seconds Server request duration, all endpoints\n# TYPE repair_network_http_duration_seconds histogram\n");
    for (i, upper) in BUCKETS.iter().enumerate() { let le = if upper.is_infinite() { "+Inf".into() } else { upper.to_string() }; body.push_str(&format!("repair_network_http_duration_seconds_bucket{{le=\"{le}\"}} {}\n",app.metrics.buckets[i].load(Ordering::Relaxed))); }
    body.push_str(&format!("repair_network_http_duration_seconds_count {}\nrepair_network_http_duration_seconds_sum {}\n",app.metrics.requests.load(Ordering::Relaxed),app.metrics.latency_us.load(Ordering::Relaxed) as f64 / 1_000_000.0));
    Ok(([(header::CONTENT_TYPE,"text/plain; version=0.0.4")], body).into_response())
}
async fn announce(app: App) {
    let mut registered = false;
    let mut ticks = tokio::time::interval(Duration::from_secs(5));
    loop {
        ticks.tick().await;
        let summary = snapshot(&app.db).await;
        let healthy = summary.is_ok();
        let metadata = json!({"runtime":"rust", "simulated":false,"application":"repair-network","ui_path":"/repair","measurement_source":"service-database","summary":summary.ok()});
        if !registered {
            let payload = json!({"id":app.node,"name":"Repair Network","node_type":"application","environment":"development","city":"Repair Services","island":"Local Jungle","version":env!("CARGO_PKG_VERSION"),"capabilities":["repair-cases","status-transitions","transactional-outbox","metrics"],"metadata":metadata});
            match app.client.post(format!("{}/api/nodes",app.registry)).json(&payload).send().await {
                Ok(r) if r.status().is_success() => registered = true,
                _ => { warn!("registry registration unavailable; retrying"); continue; }
            }
        }
        let payload = json!({"status":if healthy {"online"} else {"degraded"},"cpu_percent":null,"memory_percent":null,"metadata":metadata});
        match app.client.post(format!("{}/api/nodes/{}/heartbeat",app.registry,app.node)).json(&payload).send().await {
            Ok(r) if r.status() == StatusCode::NOT_FOUND => registered = false,
            Ok(r) if r.status().is_success() => {},
            _ => warn!("registry heartbeat unavailable; retrying"),
        }
    }
}
async fn deliver_outbox(app: App) {
    let mut ticks = tokio::time::interval(Duration::from_secs(1));
    loop {
        ticks.tick().await;
        let rows: Vec<(Uuid,Value)> = match sqlx::query_as("SELECT id,event FROM repair_network.outbox WHERE delivered_at IS NULL ORDER BY created_at,id LIMIT 50").fetch_all(&app.db).await { Ok(rows) => rows, Err(_) => {warn!("cannot read repair outbox"); continue;} };
        for (id,event) in rows {
            let _ = sqlx::query("UPDATE repair_network.outbox SET attempts=attempts+1 WHERE id=$1").bind(id).execute(&app.db).await;
            match app.client.post(format!("{}/api/application-events",app.registry)).header("x-jungle-service-token",&app.token).json(&event).send().await {
                Ok(r) if r.status().is_success() => { if sqlx::query("UPDATE repair_network.outbox SET delivered_at=NOW() WHERE id=$1").bind(id).execute(&app.db).await.is_err() {warn!(%id,"delivery acknowledgement not saved; safe duplicate retry follows");} },
                _ => {warn!(%id,"event delivery unavailable; retained in outbox"); break;}
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn lifecycle_rejects_skips_and_terminal_changes() {
        assert!(allowed("new","assessing")); assert!(allowed("quality_check","completed"));
        assert!(!allowed("new","completed")); assert!(!allowed("completed","new")); assert!(!allowed("cancelled","assessing")); assert!(!allowed("in_repair","cancelled"));
    }
    #[test] fn create_validation_bounds_and_whitespace() {
        let mut value = CreateCase{request_id:Uuid::new_v4(),vehicle:"2005 Toyota Corolla".into(),repairer:"Demo Workshop".into(),description:"Front bumper damage".into()};
        assert!(validate(&value).is_ok()); value.vehicle = " ".into(); assert!(validate(&value).is_err());
        value.vehicle = "x".repeat(121); assert!(validate(&value).is_err());
    }
    #[test] fn every_status_has_known_transition_rules() {
        for from in STATUSES { for to in STATUSES { if from == to { assert!(!allowed(from,to)); } } }
    }
}
