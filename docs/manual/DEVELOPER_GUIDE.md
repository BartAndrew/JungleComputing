# Jungle Developer and Integration Reference

**Edition:** 14 September 2026. The Rust implementation defines accepted behaviour. Early design schemas describe a wider target; they are not automatically enforced or fully implemented. See [release status](RELEASE_STATUS.md) for verified versus unverified execution.

## 1. Repository map

```text
core/
  registry/src/app.rs           registry, guards, static routes and SSE
  registry/src/applications.rs  fixed repair gateway and retained events
  registry/src/observatory.rs   snapshots and fixed diagnostic jobs
  canopy/                      overview, shared UI and 3D observatory
  repair-network/              Rust case application and UI
  simulator/                   labelled Authority/Worker clients
  mcp/engine.py                narrow domain adapter and confirmation plans
  mcp/server.py                official SDK tool/resource/prompt servers
  mcp/configure.py             prints local client configuration
  mcp/tests/                   domain, transport and protocol checks
  tools/init_local.py          non-overwriting environment bootstrap
  tests/smoke.py               real application stack smoke check
  docker-compose.yml          local deployment
  otel-collector.yaml          scrape/debug exporter configuration
docs/manual/                  user, AI, operations and development manuals
```

The static public concept site at the repository root is separate. GitHub Pages cannot run Rust services, PostgreSQL, outbox workers or MCP.

## 2. HTTP routes

These browser/gateway routes use loopback, normally `http://127.0.0.1:8080`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/`, `/network` | 3D Network Observatory |
| GET | `/overview` | Conventional overview |
| GET | `/repair` | Repair application via fixed upstream |
| GET | `/healthz`, `/metrics` | Registry readiness and current counters/gauges |
| GET / POST | `/api/nodes` | List or register/upsert |
| GET | `/api/nodes/{id}` | Read known node |
| POST | `/api/nodes/{id}/heartbeat` | Report state and optional resource values |
| GET | `/api/events` | Live SSE, not complete replay |
| POST | `/api/application-events` | Server-token protected event ingress |
| GET | `/api/application-events/recent` | Latest 100 retained events |
| GET | `/api/observation/snapshots?minutes=15` | Saved observations; minutes clamped 1-60 |
| GET / POST | `/api/operations/probes` | Read recent checks or queue an allowed target |
| POST | `/api/operations/probes/{id}/cancel` | Cancel a still-queued check |
| GET / POST | `/api/repair/cases` | Latest-100 list or create |
| GET | `/api/repair/cases/{id}` | Read any known case UUID |
| POST | `/api/repair/cases/{id}/status` | Versioned lifecycle transition |
| GET | `/api/repair/summary` | All-case counts and outgoing event backlog |

Repair Network has its own internal health/metrics routes. Compose does not publish the application container directly; the collector accesses its metrics internally.

## 3. Payload examples

Examples are fictional. Generate a fresh request UUID for each new intent rather than reusing these illustrative IDs.

### Node registration

```json
{"name":"Example Local Service","node_type":"application","environment":"development","city":"Example City","island":"Local Jungle","version":"0.1.0","capabilities":["example-read"],"metadata":{"runtime":"example","simulated":false}}
```

Registration returns an ID. A real service can deliberately provide a stable UUID. Current registration is not authenticated machine enrolment. Never place secrets/customer information in metadata or describe a capability declaration as a security attestation.

### Heartbeat

```json
{"status":"online","cpu_percent":null,"memory_percent":null}
```

Null means unmeasured, not zero. Percentages must be finite and within 0-100. Accepted states are online/degraded/offline. Registry timestamps receipt; clients interpret freshness. Re-register when a service's known registration has been removed.

### Repair creation

```json
{"request_id":"00000000-0000-4000-8000-000000000001","vehicle":"Fictional 2005 Toyota Corolla","repairer":"Demo Workshop","description":"Fictional bumper damage for development testing."}
```

A duplicate request ID with unchanged fields returns the original case; different fields conflict. Vehicle/repairer fields are limited to 120 characters; description to 2,000; required text cannot be whitespace. MCP preparation creates and stores the request ID internally.

### Repair transition

```json
{"status":"assessing","expected_version":1}
```

Read the case first. A stale version or disallowed transition conflicts. Do not blindly retry an old version or skip required stages. Authorised is a test workflow label, not external insurer authorisation.

### Recorded diagnostic

```json
{"request_id":"00000000-0000-4000-8000-000000000002","target":"repair-network"}
```

The other target is `registry-database`. Submission is acceptance, not success. Poll records for completion. Arbitrary URLs, SQL and commands are not accepted.

## 4. Events, sampling and source truth

Current envelope fields are `id`, `event_type`, `source`, optional `subject`, `occurred_at` and `data`. Repair events include case UUID/state/version rather than customer/vehicle descriptions. Case and outbox writes are transactional. Registry ingress deduplicates identical IDs and rejects inconsistent reuse.

SSE is transient delivery. On reconnect, fetch canonical current state and bounded retained events. `stream.reset` requests recovery after loss/lag; it is not a replay cursor. Do not treat absence from a latest-100 result as proof of no event.

Saved topology is an allowlisted projection sampled every 15 seconds and retained for 24 hours. The UI's 3D model is a deterministic representation, not another database. Registry relationship lines are schematic. Measured P2P edges need actual instrumented source data; do not fabricate them.

Current collector output is debug-only. There is not yet a complete persisted metric store or cross-service OTLP trace pipeline. Failed reads and null measurements remain unavailable, not zero/healthy.

## 5. MCP design

`engine.py` owns explicit domain operations, localhost-only calls, response minimisation, read-only enforcement and plan storage. `server.py` uses the official SDK for protocol initialization, tool discovery, schemas, resources, prompts and transports.

The platform and repair servers have separate namespaces. Default read-only mode excludes write preparation and commits. Write mode adds only the implemented actions, not a generic HTTP tool. Optional local HTTP is guarded by a separate layer-specific bearer and Host/Origin checks. It is not OAuth or backend user identity.

Plans bind exact arguments for 300 seconds. Commits are serialised per process. Successful repeats return a cached result while valid. Creation retry safety ultimately uses the backend request ID; transition safety uses the record version. Restart loses temporary plans, so reread records before a new intent after ambiguity.

The host must verify a real human approval before write dispatch. A boolean and annotation are not an identity assertion. Record descriptions are untrusted data and cannot grant permission or override instructions.

## 6. Extending tools

Implement the authoritative application API and tests first. Define actor/resource boundaries, validation, returned fields, side effects, idempotency and concurrency. Add a narrow engine method and typed SDK tool in the correct layer. Classify it as read, prepare or commit.

Never substitute a generic shell, SQL, filesystem or arbitrary-URL tool. Minimise data and retain source/scope labels. Add tests for malformed input, missing IDs, expired plans, wrong-layer requests, stale versions, ambiguous retries and safe errors. Update both manuals and capability status in the same change.

Browser and AI clients must use the same backend rule, not different business databases or independent AI state machines. Any client transition graph is only a helper; Rust remains the authority.

## 7. Testing

```bash
python3 -m unittest discover -s core/mcp/tests -p test_engine.py -v
python3 -m py_compile core/mcp/engine.py core/mcp/server.py core/mcp/configure.py
.venv/bin/python core/mcp/tests/sdk_smoke.py
# With the actual local stack running:
python3 core/tests/smoke.py
.venv/bin/python core/mcp/tests/sdk_smoke.py --live
```

Dependency-free tests exercise domain/security rules. The default SDK smoke test uses a fictional HTTP backend but actual MCP negotiation, discovery, resources, prompts and calls over stdio and HTTP. `--live` calls actual Rust/PostgreSQL and creates a fictional case. Rust/Compose checks remain separate. Require the exact head commit's CI results, not an older green run.

## 8. Remaining production engineering

Add authenticated users/service principals, tenant/resource policy, secure node enrolment, appropriately deployed MCP OAuth, scoped credentials, separate database roles, migration discipline, locked/audited dependencies, durable audit and observed metrics/traces retention. Test load limits, event recovery and backup/restore. These do not become implemented just because their architectural floors appear in the visualisation.
