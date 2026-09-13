# Jungle Core - Canopy and Repair Network

A local-development reference implementation with a modern shared UI, live node health, and the first persistent application.

## Run

Prerequisites: Git, Docker with Compose, Python 3 (used only to generate a token and run optional checks).

```bash
git switch build/jungle-core-v0.1
cd core
# Run this once. Preserve an existing .env when restarting.
python3 -c "import secrets; print('JUNGLE_SERVICE_TOKEN=' + secrets.token_hex(32))" > .env
docker compose up --build
```

Open `http://localhost:8080` for **Canopy**, then choose **Repair Network** in the navigation, or open `http://localhost:8080/repair`.

The database starts without demonstration repair records. Create a fictional case to see actual persisted application activity. PostgreSQL data survives container restarts through the named volume. `docker compose down -v` deliberately deletes this development data.

## Modern, functional interface

Both screens share responsive navigation, typography, spacing, accessible focus indicators, native modal dialogs, a light/dark theme, and consistent status colours with text labels. No external fonts or browser runtime libraries are required.

### Canopy

- Live registry topology with map/list modes, island/city grouping, and node inspection.
- Registered/online counts alongside actual active repairs and pending outgoing events.
- Filterable application/platform activity; routine heartbeats do not overwhelm the feed.
- Explicit states for connecting, reconnecting, unavailable services and stale node data.
- Missing CPU/memory is `Not reported`, never invented or silently converted to zero.
- `Repair Network` is a real Rust application. `Authority-01` and `Worker-01` remain clearly labelled simulators.
- Map grouping represents registration, NOT measured traffic links or distributed tracing.

### Repair Network

- Create a persisted repair case with a vehicle, repairer and damage summary.
- Search the latest 100 cases by vehicle, repairer or case ID; intersect status/view filters and sort the working list.
- View fresh case details before changing status.
- Validated lifecycle: new -> assessing -> awaiting authorisation -> authorised -> in repair -> quality check -> completed. Early-stage cancellation is explicitly confirmed.
- Required-field validation, saving indicators, disabled duplicate submission, inline errors, success messages and retry-safe creation.
- Version checks reject conflicting updates rather than overwriting another user's change.
- Summary cards cover ALL persisted cases; the table explicitly labels its latest-100 working-list scope.

## Real application integration

`Repair Network` reuses API-01's stable UUID so an existing development database upgrades without creating a duplicate application tower. The simulator no longer registers API-01.

Case data and an outgoing event are committed in the same PostgreSQL transaction. A worker retries delivery to the registry. The registry persists and deduplicates those events before broadcasting them to Canopy over SSE. Reloading Canopy fetches recent persisted application events. Node events remain transient. This is not an exactly-once delivery or full event replay implementation.

`core/registry/src/applications.rs` provides a fixed upstream gateway. A generated server-only development token protects application API calls and event ingestion. The browser never receives that token. The gateway does not accept arbitrary destination URLs.

The monitoring paths are parallel, not a serial chain:

```text
Application -> PostgreSQL case + outbox -> registry event store -> SSE / recent events -> Canopy
Application -> registry heartbeat -> node inventory -> Canopy
Application / registry metrics -> OpenTelemetry Collector -> debug exporter
```

The collector scrapes BOTH services. It currently exports debug output, not retained metric history. Request logs include timing and request IDs; full cross-service OTLP tracing is not implemented. There are no fabricated trend charts.

## API surface

Public within this loopback-only developer workspace:

- `GET /healthz`, `/metrics`, `/api/nodes`, `/api/nodes/{id}`
- `POST /api/nodes`, `/api/nodes/{id}/heartbeat`
- `GET /api/events`, `/api/application-events/recent`
- `GET/POST /api/repair/cases`
- `GET /api/repair/cases/{id}`, `/api/repair/summary`
- `POST /api/repair/cases/{id}/status`

Server-to-server only: `POST /api/application-events`, guarded by the generated token. The repair container itself is not published to the host.

## Verification

```bash
python3 core/tests/smoke.py       # from repository root, with Compose running
cargo test --manifest-path core/registry/Cargo.toml
cargo test --manifest-path core/repair-network/Cargo.toml
```

The smoke script tests the actual service registration, shared UI routes, persistence APIs, duplicate-create safety, status rules, conflict handling, cross-origin blocking, event delivery and summary reconciliation.

Initial UI browser verification used explicitly fictional fixture responses and checked desktop/mobile rendering, map/list switching, node inspection, search/clear, create/update interactions, modal dismissal, themes and service failure/recovery. That is UI evidence, not proof the Rust stack passed. GitHub CI separately builds/tests both Rust crates and starts the Compose stack for integration checks.

## Development boundary

Do not expose this stack publicly or use real customer/claim data. Only the registry is published, on `127.0.0.1:8080`; database, repair service and collector are internal. Host and cross-origin write checks reduce accidental browser exposure but are NOT authentication. There is no user identity, tenancy, user permission enforcement or TLS termination. The shared database login, startup migrations, moving Rust builder tag and missing committed Cargo lockfiles need production hardening. Approval is an internal status label, not an insurer authorisation.

Still out of scope: booking capacity, insurer integrations, photos/files, payments, customer portals, retained telemetry history, 3D traffic visualisation and production deployment. These screens intentionally contain no fake controls for those features.
