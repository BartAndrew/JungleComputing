//! Bounded topology history and read-only health-check jobs. Development only.
//! No user-supplied endpoint is ever fetched; no shell or arbitrary workload execution.
use super::*;
use axum::extract::Query;
use std::time::Instant;

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route("/network",get(|| async {Html(include_str!("../../canopy/network.html"))}))
        .route("/network.css",get(|| async {([(header::CONTENT_TYPE,"text/css; charset=utf-8")],include_str!("../../canopy/network.css"))}))
        .route("/network-app.mjs",get(|| async {([(header::CONTENT_TYPE,"text/javascript; charset=utf-8")],include_str!("../../canopy/network-app.mjs"))}))
        .route("/network-scene.mjs",get(|| async {([(header::CONTENT_TYPE,"text/javascript; charset=utf-8")],include_str!("../../canopy/network-scene.mjs"))}))
        .route("/network-model.mjs",get(|| async {([(header::CONTENT_TYPE,"text/javascript; charset=utf-8")],include_str!("../../canopy/network-model.mjs"))}))
        .route("/api/observation/snapshots",get(history))
        .route("/api/operations/probes",get(jobs).post(submit))
        .route("/api/operations/probes/{id}/cancel",post(cancel))
}

pub(super) async fn start(state: AppState) -> anyhow::Result<()> {
    sqlx::raw_sql(r#"
      CREATE TABLE IF NOT EXISTS jungle_topology_snapshots (
        id BIGSERIAL PRIMARY KEY, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), nodes JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jungle_topology_time ON jungle_topology_snapshots(observed_at);
      CREATE TABLE IF NOT EXISTS jungle_probe_jobs (
        id UUID PRIMARY KEY, request_id UUID UNIQUE NOT NULL, target TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
        duration_ms DOUBLE PRECISION, detail TEXT
      );
      CREATE INDEX IF NOT EXISTS jungle_probe_queue ON jungle_probe_jobs(created_at) WHERE status='queued';
    "#).execute(&state.db).await?;
    let collector=state.clone();
    tokio::spawn(async move {
        let mut timer=tokio::time::interval(Duration::from_secs(15));
        timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {timer.tick().await; if let Err(e)=snapshot(&collector.db).await {error!(error=%e,"topology snapshot failed");}}
    });
    tokio::spawn(worker(state));
    Ok(())
}
async fn snapshot(db: &PgPool) -> Result<(),sqlx::Error> {
    // Project explicitly allowed fields: no tokens, full manifests, case content or arbitrary metadata.
    sqlx::query(r#"INSERT INTO jungle_topology_snapshots(nodes)
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',id,'name',name,'node_type',node_type,'environment',environment,'city',city,'island',island,
        'version',version,'capabilities',capabilities,'status',status,'cpu_percent',cpu_percent,
        'memory_percent',memory_percent,'last_seen_at',last_seen_at,'registered_at',registered_at,
        'metadata',jsonb_build_object('runtime',metadata->'runtime','simulated',metadata->'simulated','application',metadata->'application')
      ) ORDER BY id),'[]'::jsonb) FROM jungle_nodes"#).execute(db).await?;
    sqlx::query("DELETE FROM jungle_topology_snapshots WHERE observed_at<NOW()-INTERVAL '24 hours'").execute(db).await?;
    sqlx::query("DELETE FROM jungle_probe_jobs WHERE finished_at<NOW()-INTERVAL '7 days'").execute(db).await?;
    Ok(())
}
#[derive(Deserialize)]
struct Window {minutes: Option<i32>}
async fn history(State(s):State<AppState>,Query(q):Query<Window>) -> Result<Json<Value>,ApiError> {
    let minutes=q.minutes.unwrap_or(60).clamp(1,60);
    let rows:Vec<(i64,DateTime<Utc>,Value)>=sqlx::query_as("SELECT id,observed_at,nodes FROM jungle_topology_snapshots WHERE observed_at>NOW()-make_interval(mins => $1) ORDER BY observed_at DESC,id DESC LIMIT 241")
        .bind(minutes).fetch_all(&s.db).await?;
    Ok(Json(json!({"snapshots":rows.into_iter().rev().map(|(id,observed_at,nodes)|json!({"id":id,"observed_at":observed_at,"nodes":nodes})).collect::<Vec<_>>(),"sample_interval_seconds":15,"retention_hours":24,"minutes":minutes})))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Submit {request_id:Uuid,target:String}
fn supported(target:&str)->bool {matches!(target,"registry-database"|"repair-network")}
async fn submit(State(s):State<AppState>,Json(i):Json<Submit>)->Result<Response,ApiError>{
    if i.request_id.is_nil()||!supported(&i.target){return Ok(failure(StatusCode::BAD_REQUEST,"unsupported_probe"));}
    let mut tx=s.db.begin().await?;
    // Serialize bounded queue admission and duplicate detection across concurrent callers.
    sqlx::query("SELECT pg_advisory_xact_lock(784332901)").execute(&mut *tx).await?;
    let existing:Option<(Uuid,String)>=sqlx::query_as("SELECT id,target FROM jungle_probe_jobs WHERE request_id=$1").bind(i.request_id).fetch_optional(&mut *tx).await?;
    if let Some((id,target))=existing{if target!=i.target{return Ok(failure(StatusCode::CONFLICT,"request_id_conflict"));}return Ok(Json(json!({"id":id,"duplicate":true})).into_response());}
    let pending:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM jungle_probe_jobs WHERE status IN ('queued','running')").fetch_one(&mut *tx).await?;
    if pending.0>=4{return Ok(failure(StatusCode::TOO_MANY_REQUESTS,"probe_queue_full"));}
    let recent:(i64,)=sqlx::query_as("SELECT COUNT(*) FROM jungle_probe_jobs WHERE created_at>NOW()-INTERVAL '2 seconds'").fetch_one(&mut *tx).await?;
    if recent.0>0{return Ok(failure(StatusCode::TOO_MANY_REQUESTS,"probe_rate_limited"));}
    let id=Uuid::new_v4();
    sqlx::query("INSERT INTO jungle_probe_jobs(id,request_id,target,status) VALUES($1,$2,$3,'queued')").bind(id).bind(i.request_id).bind(&i.target).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok((StatusCode::ACCEPTED,Json(json!({"id":id,"status":"queued","duplicate":false}))).into_response())
}
async fn jobs(State(s):State<AppState>)->Result<Json<Value>,ApiError>{
    let rows:Vec<(Value,)>=sqlx::query_as("SELECT to_jsonb(j) FROM (SELECT id,target,status,created_at,started_at,finished_at,duration_ms,detail FROM jungle_probe_jobs ORDER BY created_at DESC,id DESC LIMIT 50) j").fetch_all(&s.db).await?;
    Ok(Json(json!({"jobs":rows.into_iter().map(|v|v.0).collect::<Vec<_>>(),"retention_days":7,"limit":50})))
}
async fn cancel(Path(id):Path<Uuid>,State(s):State<AppState>)->Result<Response,ApiError>{
    let r=sqlx::query("UPDATE jungle_probe_jobs SET status='cancelled',finished_at=NOW(),detail='cancelled_before_execution' WHERE id=$1 AND status='queued'").bind(id).execute(&s.db).await?;
    if r.rows_affected()==0{return Ok(failure(StatusCode::CONFLICT,"probe_not_queued"));}
    Ok(Json(json!({"id":id,"status":"cancelled"})).into_response())
}
async fn worker(s:AppState){
    let client=match reqwest::Client::builder().timeout(Duration::from_secs(4)).redirect(reqwest::redirect::Policy::none()).build(){Ok(c)=>c,Err(e)=>{error!(error=%e,"probe client unavailable");return;}};
    let mut timer=tokio::time::interval(Duration::from_secs(1));timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    loop {timer.tick().await;if let Err(e)=run_one(&s,&client).await{error!(error=%e,"probe worker unavailable");}}
}
async fn run_one(s:&AppState,client:&reqwest::Client)->Result<(),sqlx::Error>{
    // A crashed worker's old claim is not silently presented as successful or stuck forever.
    sqlx::query("UPDATE jungle_probe_jobs SET status='failed',finished_at=NOW(),detail='worker_interrupted' WHERE status='running' AND started_at<NOW()-INTERVAL '30 seconds'").execute(&s.db).await?;
    let claim:Option<(Uuid,String)>=sqlx::query_as(r#"UPDATE jungle_probe_jobs SET status='running',started_at=NOW()
      WHERE id=(SELECT id FROM jungle_probe_jobs WHERE status='queued' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,target"#).fetch_optional(&s.db).await?;
    let Some((id,target))=claim else{return Ok(());};
    let start=Instant::now();
    let (ok,detail)=if target=="registry-database" {
        match tokio::time::timeout(Duration::from_secs(4),sqlx::query("SELECT 1").execute(&s.db)).await {
            Ok(Ok(_))=>(true,"database_responded"),Ok(Err(_))=>(false,"database_unavailable"),Err(_)=>(false,"probe_timeout")
        }
    }else{
        let base=env::var("REPAIR_NETWORK_URL").unwrap_or_else(|_|"http://127.0.0.1:8081".into());
        match client.get(format!("{}/healthz",base.trim_end_matches('/'))).send().await {
            Ok(r) if r.status().is_success()=>match r.json::<Value>().await{Ok(v) if v["status"]=="ok"=>(true,"service_healthy"),_=>(false,"unexpected_health_response")},
            Ok(_)=>(false,"service_unhealthy"),Err(e) if e.is_timeout()=>(false,"probe_timeout"),Err(_)=>(false,"service_unreachable")
        }
    };
    let duration=start.elapsed().as_secs_f64()*1000.0;
    let status=if ok{"succeeded"}else{"failed"};
    let event=PlatformEvent{id:Uuid::new_v4(),event_type:"diagnostic.completed".into(),source:"jungle-registry".into(),subject:Some(id.to_string()),occurred_at:Utc::now(),data:json!({"target":target,"status":status,"duration_ms":duration})};
    let mut tx=s.db.begin().await?;
    let updated=sqlx::query("UPDATE jungle_probe_jobs SET status=$2,finished_at=NOW(),duration_ms=$3,detail=$4 WHERE id=$1 AND status='running'").bind(id).bind(status).bind(duration).bind(detail).execute(&mut *tx).await?;
    if updated.rows_affected()==1{
        // Store result + its event atomically, then deliver live. Recent-events reads recover missed broadcasts.
        sqlx::query("INSERT INTO jungle_application_events(id,envelope) VALUES($1,$2)").bind(event.id).bind(serde_json::to_value(&event).expect("serializable event")).execute(&mut *tx).await?;
        tx.commit().await?;let _=s.events.send(event);
    }
    Ok(())
}
fn failure(status:StatusCode,code:&str)->Response{(status,Json(json!({"error":code}))).into_response()}
pub(super) async fn metrics(db:&PgPool)->Result<String,sqlx::Error>{
    let counts:Vec<(String,i64)>=sqlx::query_as("SELECT status,COUNT(*) FROM jungle_probe_jobs GROUP BY status").fetch_all(db).await?;
    let sample:(i64,Option<f64>)=sqlx::query_as("SELECT COUNT(*),EXTRACT(EPOCH FROM NOW()-MAX(observed_at))::DOUBLE PRECISION FROM jungle_topology_snapshots").fetch_one(db).await?;
    let mut text=String::from("# TYPE jungle_probe_jobs gauge\n");
    for status in ["queued","running","succeeded","failed","cancelled"]{let count=counts.iter().find(|(s,_)|s==status).map(|(_,n)|*n).unwrap_or(0);text.push_str(&format!("jungle_probe_jobs{{status=\"{status}\"}} {count}\n"));}
    text.push_str(&format!("# TYPE jungle_topology_snapshots gauge\njungle_topology_snapshots {}\n",sample.0));
    if let Some(age)=sample.1{text.push_str(&format!("# TYPE jungle_topology_snapshot_age_seconds gauge\njungle_topology_snapshot_age_seconds {}\n",age.max(0.0)));}
    Ok(text)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]fn fixed_probe_targets_only(){assert!(supported("registry-database"));assert!(supported("repair-network"));assert!(!supported("http://169.254.169.254"));assert!(!supported("shell"));}
}
