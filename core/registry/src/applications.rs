//! Shared observation ingress and an explicitly configured development application gateway.
use super::*;
use axum::{body::{to_bytes, Body}, extract::Request, http::HeaderMap};

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/application-events", post(ingest))
        .route("/api/application-events/recent", get(recent))
        .route("/repair", get(proxy))
        .route("/api/repair/{*path}", get(proxy).post(proxy))
}

pub(super) async fn migrate(db: &PgPool) -> anyhow::Result<()> {
    sqlx::raw_sql("CREATE TABLE IF NOT EXISTS jungle_application_events (sequence BIGSERIAL UNIQUE NOT NULL, id UUID PRIMARY KEY, envelope JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW());").execute(db).await?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct IncomingEvent {
    id: Uuid, event_type: String, source: String, subject: Option<String>,
    occurred_at: DateTime<Utc>, data: Value,
}

async fn ingest(State(state): State<AppState>, headers: HeaderMap, Json(input): Json<IncomingEvent>) -> Response {
    let token = env::var("JUNGLE_SERVICE_TOKEN").unwrap_or_default();
    if token.len() < 32 { return failure(StatusCode::SERVICE_UNAVAILABLE, "event_ingress_not_configured"); }
    if headers.get("x-jungle-service-token").and_then(|v| v.to_str().ok()) != Some(token.as_str()) { return failure(StatusCode::UNAUTHORIZED, "unauthorised"); }
    // This bootstrap writer has only the two event capabilities implemented by Repair Network.
    if input.id.is_nil() || input.source != "repair-network" || !matches!(input.event_type.as_str(), "repair_case.created" | "repair_case.status_changed") {
        return failure(StatusCode::BAD_REQUEST, "unsupported_event");
    }
    let event = PlatformEvent {id:input.id,event_type:input.event_type,source:input.source,subject:input.subject,occurred_at:input.occurred_at,data:input.data};
    let envelope = match serde_json::to_value(&event) { Ok(v) => v, Err(_) => return failure(StatusCode::BAD_REQUEST,"invalid_event") };
    match sqlx::query("INSERT INTO jungle_application_events(id,envelope) VALUES($1,$2) ON CONFLICT(id) DO NOTHING")
        .bind(event.id).bind(&envelope).execute(&state.db).await {
        Ok(result) => {
            let inserted = result.rows_affected() == 1;
            if inserted { let _ = state.events.send(event); }
            else {
                let existing: Result<(Value,),_> = sqlx::query_as("SELECT envelope FROM jungle_application_events WHERE id=$1").bind(event.id).fetch_one(&state.db).await;
                match existing { Ok((previous,)) if previous == envelope => {}, Ok(_) => return failure(StatusCode::CONFLICT,"event_id_conflict"), Err(_) => return failure(StatusCode::SERVICE_UNAVAILABLE,"event_store_unavailable") }
            }
            Json(json!({"accepted":true,"duplicate":!inserted})).into_response()
        },
        Err(err) => { error!(error=%err,"application event storage failed"); failure(StatusCode::SERVICE_UNAVAILABLE,"event_store_unavailable") }
    }
}
async fn recent(State(state): State<AppState>) -> Response {
    let rows: Result<Vec<(Value,)>,_> = sqlx::query_as("SELECT envelope FROM jungle_application_events ORDER BY sequence DESC LIMIT 100").fetch_all(&state.db).await;
    match rows { Ok(rows) => ([(header::CACHE_CONTROL,"no-store")],Json(json!({"events":rows.into_iter().map(|v|v.0).collect::<Vec<_>>(),"limit":100}))).into_response(), Err(_) => failure(StatusCode::SERVICE_UNAVAILABLE,"event_store_unavailable") }
}
async fn proxy(request: Request) -> Response {
    // The host comes only from deployment configuration, never a URL supplied by the browser.
    let base = env::var("REPAIR_NETWORK_URL").unwrap_or_else(|_| "http://127.0.0.1:8081".into());
    let token = env::var("JUNGLE_SERVICE_TOKEN").unwrap_or_default();
    if token.len() < 32 { return failure(StatusCode::SERVICE_UNAVAILABLE,"repair_gateway_not_configured"); }
    let path = if request.uri().path() == "/repair" { "/" } else { request.uri().path() };
    let url = format!("{}{}",base.trim_end_matches('/'),path);
    let method = request.method().clone();
    let body = match to_bytes(request.into_body(),16*1024).await { Ok(b) => b, Err(_) => return failure(StatusCode::PAYLOAD_TOO_LARGE,"request_too_large") };
    let client = match reqwest::Client::builder().timeout(Duration::from_secs(5)).redirect(reqwest::redirect::Policy::none()).build() { Ok(c) => c, Err(_) => return failure(StatusCode::BAD_GATEWAY,"repair_unavailable") };
    match client.request(method,url).header("x-jungle-service-token",token).header(header::CONTENT_TYPE,"application/json").body(body).send().await {
        Ok(upstream) => {
            let status = upstream.status();
            let content_type = upstream.headers().get(header::CONTENT_TYPE).cloned();
            match upstream.bytes().await {
                Ok(body) => { let mut result = Response::new(Body::from(body)); *result.status_mut()=status; if let Some(value)=content_type {result.headers_mut().insert(header::CONTENT_TYPE,value);} result.headers_mut().insert(header::CACHE_CONTROL,axum::http::HeaderValue::from_static("no-store")); result },
                Err(_) => failure(StatusCode::BAD_GATEWAY,"repair_unavailable")
            }
        },
        Err(_) => failure(StatusCode::BAD_GATEWAY,"repair_unavailable")
    }
}
fn failure(status: StatusCode, error: &str) -> Response { (status,Json(json!({"error":error}))).into_response() }
