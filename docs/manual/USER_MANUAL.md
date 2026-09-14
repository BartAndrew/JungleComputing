# Jungle Computing - Detailed User Manual

**Edition:** 14 September 2026  
**Applies to:** `build/jungle-core-v0.1`, including Network Observatory and MCP additions.  
**Audience:** local platform operators, Repair Network evaluators, developers and AI-host administrators.

> This is a development platform, not a production repair or insurance service. Use fictional data. User login, organisation isolation, customer permissions and insurer approval integration are not implemented. A live tower or an MCP connection does not change that boundary. Consult [release status](RELEASE_STATUS.md) for verification evidence.

## Contents

1. [What Jungle is](#1-what-jungle-is)
2. [Available capabilities](#2-available-capabilities)
3. [Installation and startup](#3-installation-and-startup)
4. [First-use walkthrough](#4-first-use-walkthrough)
5. [Navigation and common controls](#5-navigation-and-common-controls)
6. [The 3D Network Observatory](#6-the-3d-network-observatory)
7. [Node inspection and health](#7-node-inspection-and-health)
8. [Activity and real-time behaviour](#8-activity-and-real-time-behaviour)
9. [Recorded topology and replay](#9-recorded-topology-and-replay)
10. [Platform health-check jobs](#10-platform-health-check-jobs)
11. [Platform overview](#11-platform-overview)
12. [Repair Network](#12-repair-network)
13. [Interacting through an AI](#13-interacting-through-an-ai)
14. [Measurements and their limits](#14-measurements-and-their-limits)
15. [Daily operating routine](#15-daily-operating-routine)
16. [Troubleshooting](#16-troubleshooting)
17. [Planned capabilities](#17-planned-capabilities)
18. [Glossary](#18-glossary)

Companion guides: [AI/MCP](MCP_GUIDE.md), [operations and recovery](OPERATIONS.md), [developer/API reference](DEVELOPER_GUIDE.md).

## 1. What Jungle is

Jungle Computing is the reusable platform beneath applications such as Repair Network. Its current implementation comprises a Rust registry/gateway, PostgreSQL storage, a real Rust Repair Network service, Canopy administration, and optional AI interfaces. The application owns repair-case business rules; Jungle provides registration, observation, event exchange and a local gateway.

The intended architecture separates three responsibilities. The **control plane** manages identity, policy, configuration and coordination. The **runtime/data plane** executes application work and stores records. The **observation plane** explains the state and behaviour of the others. Not every capability in that design is implemented today.

Information takes parallel paths:

```text
Repair action -> case + outbox transaction -> registry event store -> Canopy activity
Repair service -> heartbeat -> registry inventory -> Canopy topology
Services -> Prometheus-format measurements -> OpenTelemetry Collector debug output
AI host -> platform or repair MCP -> the same local Jungle APIs
```

An **island** is a declared grouping, a **city** is a grouping inside it, and a **tower** is a registered node/service. Current city/island fields are labels, not enforced geographical, network or security boundaries. The registry gateway drawn in 3D represents the control endpoint; it is not counted as an invented node.

The four gold foundation floors represent security, data, communication and compute. Upper floors represent declared capabilities. These floors explain the architecture; they do not certify that authentication, distributed storage or peer-to-peer execution is active.

## 2. Available capabilities

| Capability | Available behaviour | Boundary |
|---|---|---|
| Registry | Register, inspect and update node heartbeats | Not authenticated device enrolment |
| Canopy | 3D network, accessible list, overview, inspector and activity | Source-backed topology, not an observed P2P packet map |
| Health detection | Freshness checks and stale/offline display | A heartbeat does not prove every business function works |
| Recorded topology | Saved samples and replay | Sampling, not continuous video or distributed trace replay |
| Diagnostic jobs | Check registry database or Repair Network; inspect outcomes | Fixed targets, not a general job runner |
| Repair Network | Create/read cases and advance a validated lifecycle | No insurance, booking, financial or parts integration |
| Application events | Transactional outbox, retries and registry deduplication | Not exactly-once delivery or complete event sourcing |
| Measurements | Counts, request counters, latency buckets and queue age | No complete retained metrics/traces backend |
| MCP | Separate platform/repair tools, stdio and protected local HTTP | Local operator scope, not OAuth or tenant identity |

A feature branch is not the same as a deployed service. Read the release record before treating a completed code file as a verified running feature.

## 3. Installation and startup

### 3.1 Prerequisites

Use Git, Docker and Docker Compose. Python 3 supports the setup helper and checks; Python 3.11 or newer is the supported MCP path. A current browser must support JavaScript modules. WebGL is the preferred 3D renderer; a software fallback and accessible list are also provided. Verify graphics behaviour on your actual device.

The containers run PostgreSQL, registry, Repair Network, labelled simulators and the OpenTelemetry Collector. Initial builds download dependencies and compile Rust. A local Rust installation is not necessary when using Docker. Compose configuration validation does not prove compilation or startup has passed.

### 3.2 Get the correct branch

For a new checkout:

```bash
git clone --branch build/jungle-core-v0.1 https://github.com/BartAndrew/JungleComputing.git
cd JungleComputing
```

For an existing clean checkout:

```bash
git fetch origin
git switch build/jungle-core-v0.1
git pull --ff-only
```

Preserve local work before switching. Do not use a forced reset to fix a branch mismatch. Until the pull request is merged, `main` can show the older public concept site instead of the operational application.

### 3.3 Create configuration safely

From the repository root:

```bash
python3 core/tools/init_local.py
```

On Windows use `python core/tools/init_local.py`. The helper creates `core/.env` only when it is absent, generates a random service token and does not print it. Existing configuration is preserved. Do not commit `.env`, paste it into a chat or put its token into browser JavaScript.

`JUNGLE_SERVICE_TOKEN` is a server-to-server development secret shared by registry and Repair Network. It is not a user password, an MCP HTTP token or a substitute for per-user authorisation.

### 3.4 Start services

```bash
cd core
docker compose up --build
```

Leave this terminal open, or use `docker compose up -d --build` for detached local operation. Inspect `docker compose ps` for service/health state. Open:

```text
http://localhost:8080             Network Observatory
http://localhost:8080/network     Network Observatory
http://localhost:8080/overview    Conventional platform overview
http://localhost:8080/repair      Repair Network
```

Only the registry is published on loopback. Port 8081 is internal to the repair container, not a second browser entry point. PostgreSQL and the collector are not published on the host. Do not open router ports or bind the development gateway publicly.

### 3.5 Stop, restart and update

From `core`, `docker compose stop` stops services without deleting stored data. `docker compose start` starts existing containers. `docker compose down` removes containers/network while preserving the named PostgreSQL volume. After pulling new source use `docker compose up -d --build`, because the served UI is embedded in compiled Rust binaries.

**Do not add `-v` casually.** `docker compose down -v` deletes the named data volume: cases, outbox, retained events, snapshots and checks. It is a destructive reset, not routine maintenance.

## 4. First-use walkthrough

Open the observatory. Find **Repair Network** in **Repair Services**, under **Local Jungle**. **Authority-01** and **Worker-01** remain simulators; their presence does not implement real policy or distributed compute.

Select the Repair Network tower. Verify its runtime and heartbeat. CPU/memory may be “Not reported”; this is expected for the real repair service. Missing measurements are not replaced with invented percentages.

Open Repair Network using navigation or the inspector. The database contains no automatic demonstration cases. Choose **New repair case** and enter a fictional vehicle, fictional repairer and fictional damage summary. Create it and inspect its details. Initial stage is New, version 1.

Select Assessing as the next step and save. Return to Canopy. The current count should include the saved case, and creation/status-change events should appear after delivery. Delays can occur while the outbox or connection recovers. Do not repeatedly create cases to compensate for a slow feed.

Run **Check Repair Network**. Follow its queued/running/completed record and measured outcome. Success verifies the implemented health endpoint, not an insurer workflow or end-to-end customer repair.

## 5. Navigation and common controls

The sidebar separates the platform overview, Network Observatory and Repair Network. The theme button selects light/dark presentation. Theme choice is stored on the current browser, not as a shared service configuration.

**Refresh** requests current data. Periodic reads and selected incoming events also refresh the view. The connection indicator distinguishes live event streaming, polling/reconnection and disconnection. Read its text as well as its colour.

Search and filter controls change a working view, not the underlying records. The UI identifies application-wide totals separately from node-filtered counts. Keyboard users can Tab through labelled controls, use visible focus indicators and choose the accessible list. Use Close to dismiss dialogs; avoid dismissing a save in progress.

## 6. The 3D Network Observatory

### 6.1 Camera and selection

Drag to orbit, use the wheel to zoom, or use a two-pointer touch gesture. Shift-drag/right-button drag pans the target. With the canvas focused, arrow keys orbit, plus/minus zoom, and `0` fits the network. Select a labelled tower or an accessible-list entry to inspect the same record.

**Fit network** includes the current visible network. **Top view** selects a near-overhead angle. **Focus tower** centres the selected node. **Fullscreen** expands the scene panel where supported; use Exit fullscreen to return.

### 6.2 Layers and motion

**Layers** selects whole tower, foundation or application floors. **Explode** separates floors. These controls do not enable/disable services. **Pause motion** stops pulse animation, not backend collection, jobs or polling. Reduced-motion preferences initialise motion paused. Returning from replay does not automatically have to resume it; use the explicit control.

The renderer caps drawing frequency and reduces hidden-tab work. Large scenes still consume browser resources. The view is not an argument for running browser compute on every device.

### 6.3 Search and scope

Search by node name, ID, city or capability. Filter by island or hide simulators. **Clear** resets filters and fits the network. These controls scope node totals and the scene/list. **Active repairs** remains application-wide, not filtered to an island or node search.

Rendering is bounded to 128 towers, with an omitted-count notice. Use the accessible list for all matches. Tower height is a capped display of declared capability count, not CPU power, memory size, trust, monetary value or uptime.

### 6.4 Lines, colours and pulses

Live nodes and simulator open frames are distinct. Gold represents foundations. Degraded and offline/stale states have separate colours and text. Registry links connect nodes to the schematic control endpoint. They are **not discovered P2P links, measured bandwidth, firewall rules or latency measurements**. Turning Registry links off only hides those lines.

Pulses are triggered by newly received node/application events. Their travel duration is illustrative and cannot establish request latency. Historical events fetched after reload are not replayed as new live traffic. A quiet scene can mean no new work; artificial events must not be added solely to make it look busy.

## 7. Node inspection and health

The inspector shows name/ID, runtime, version, heartbeat and capabilities. CPU/memory values are self-reported; simulator percentages are synthetic. Real services return null where those measurements are not collected.

**Online** combines a recent heartbeat with a compatible reported state. **Degraded** is an explicitly degraded report. **Offline** is a source state, including missed-heartbeat marking. **Stale** means the observation cannot be treated as current. **Unknown** covers unusable information such as an invalid timestamp.

The browser uses a 25-second freshness threshold. The registry checks periodically and marks missed heartbeats offline after a 20-second cutoff; the ten-second sweep means marking is not instantaneous at precisely 20 seconds. A disconnected browser must not continue claiming current health.

Inspect the last heartbeat and the process logs before intervening. Liveness is not proof that every queue, database dependency or business endpoint works. Use a diagnostic or application read for additional evidence.

MCP servers can register as **Jungle Platform MCP** and **Repair Network MCP**, in **AI Gateways**. Their Python processes send heartbeats while attached to a host. Use one process per layer in this development workspace: the default identity is stable per layer, so concurrent copies could report against the same node.

## 8. Activity and real-time behaviour

Select All, Application or Platform in the activity feed. Routine heartbeats do not flood the textual feed, though received heartbeats can animate the scene. Meaningful node changes and retained application/diagnostic events appear with source and time.

A repair change and its outbox entry commit in one database transaction. A worker attempts registry delivery. The registry stores and deduplicates the event before broadcasting it. Recent-event reads recover a bounded set after reload/reconnection.

The recent-events API returns at most 100 retained events; screens show a shorter working feed. Node events are transient. An old event missing from the screen does not prove it never occurred. This is not a complete legal audit, change-history browser or exactly-once delivery guarantee.

During delivery interruption, the case can already be saved. Confirm its actual details. Review pending event count and oldest age, then recover the failing server dependency. Restarting a browser cannot fix a server token mismatch or database failure.

## 9. Recorded topology and replay

The registry saves samples approximately every 15 seconds. It retains 24 hours; the current browsing endpoint exposes up to 60 minutes. The slider selects actual observations, not interpolation.

Read the selected timestamp. Health is evaluated relative to that observation. Current repair totals are not relabelled as historical totals. Activity remains live and separate. Diagnostic write controls are disabled in replay to avoid acting on stale context.

Select **Live** to return to current observations. Missing samples remain gaps and can indicate downtime or failed writes. Replay is not complete uptime proof, distributed request tracing or every-packet playback. Snapshot projection excludes arbitrary metadata and case text, but operational identifiers can still be sensitive when shared.

## 10. Platform health-check jobs

**Check registry database** performs a fixed readiness query. **Check Repair Network** calls the configured health endpoint. There is no model/user-supplied destination, SQL command or shell command.

Checks persist as queued, running and then succeeded/failed, with elapsed duration and a short outcome. Queued jobs can be cancelled; running/completed jobs cannot. Run again creates a new check after reviewing failure.

Admission is limited to four queued/running checks and bounded submission frequency. A rate-limit or full-queue result is not a platform crash. Duplicate request IDs are recognised. Abandoned worker claims beyond the recovery threshold become interrupted failures, not silent success.

The UI exposes the latest 50 records and retains finished checks for seven days. Duration measures that readiness check, not a customer transaction or entire distributed network. These controls do not restart services, kill processes or execute arbitrary workloads.

## 11. Platform overview

The compact overview at `/overview` remains useful when 3D is unnecessary. It shows registry counts, repair totals, pending events, grouping/list controls, node details and activity.

Read each scope label. Registry totals are inventory, not capacity forecasts. Active repairs excludes completed/cancelled cases. Pending events are saved work awaiting acknowledgment. A failed query is unavailable/unknown, not zero. A fresh registry response does not prove the repair summary has also recovered.

## 12. Repair Network

### 12.1 The record

A current repair case has a UUID, vehicle description, repairer description, damage summary, lifecycle state, integer version and timestamps. These are not yet linked to separate customer, VIN, supplier, insurer or organisation master records.

Do not use actual VINs, registrations, customer identities, claim documents or confidential business content in this build. Its purpose is to prove application/platform coordination using fictional cases.

### 12.2 Create

Choose **New repair case**. Vehicle and repairer allow up to 120 characters each; damage summary allows 2,000. Fields cannot contain only whitespace. Select Create case once and observe saving feedback.

On success, the dialog closes, the list refreshes, and a version-1 New case plus `repair_case.created` outbox record exists. The UI uses a request ID so an unchanged retry returns the same case. Following an ambiguous timeout, retry the same unchanged form; changed content or a separate new form can represent a new request.

### 12.3 Search and filter

Use All cases, Active, Awaiting approval or Closed, intersected with status/search filters. Search vehicle, repairer or case ID and sort updated/newest/oldest within the loaded list.

The table contains the latest **100 created cases**. Summary cards cover **all persisted cases**. A tab total can exceed displayed matching rows. A search miss does not prove an older case is absent. A known full UUID can be retrieved directly through the API/MCP. Full historical pagination is not implemented.

### 12.4 Inspect and progress

Open View or select the vehicle. Details fetch a fresh version. Review the identity, repairer, summary, current state and timestamps before choosing the next action.

```text
new -> assessing -> awaiting_authorisation -> authorised
    -> in_repair -> quality_check -> completed
```

Each arrow is a separate valid transition; skipping from New to Completed is rejected. Cancellation is allowed from New, Assessing, Awaiting authorisation or Authorised, but not after In repair. Completed/Cancelled are terminal; there is no reopen action.

**Authorised is an internal test status.** It does not obtain insurer authorisation, confirm coverage, certify a method or commit a payment. Quality check and Completed are recorded stages, not automated repair-safety certification.

### 12.5 Conflicts and cancellation

Writes include the version reviewed. If another action changed the record, the backend rejects your stale version. Refresh and consciously choose the next valid action; do not repeatedly resend the obsolete version.

Cancelled displays an explicit warning and confirmation wording. Review the case identity carefully: this build has no undo. Cancellation keeps the record and counts it as closed; it is not deletion.

### 12.6 Verify in Canopy

A confirmed save can precede event delivery. Check the actual case rather than using notification absence to infer failure. Restore outbox delivery when needed. There is currently no general field editor, file uploader, booking calendar, estimating editor, supplier order screen, payment screen or customer login. Those belong to the wider vision, not this implemented workflow.

## 13. Interacting through an AI

Follow [MCP_GUIDE.md](MCP_GUIDE.md). A compatible AI host connects to MCP; a model alone does not discover your machine or gain permission.

Use platform tools for nodes, retained events, topology and diagnostics, and repair tools for case totals, search/details and lifecycle. Connecting one layer does not expose the other's tools. Begin read-only. Ask for live evidence, observation time and scope. A latest-100 search must never be reported as a whole-database search.

When deliberately enabling writes, the AI prepares an exact change, shows its preview and requests your approval before committing. Plans expire after five minutes and are process-local. A confirmation boolean is not proof that a human consented; keep host approval prompts enabled.

GitHub code does not automatically connect this ChatGPT conversation. Local hosts can use stdio after setup. Hosted ChatGPT requires a supported reachable MCP connection or secure bridge and workspace configuration. Do not expose unauthenticated port 8080 as a shortcut. The AI guide explains the deployment boundary.

## 14. Measurements and their limits

| Measurement | Means | Does not establish |
|---|---|---|
| Registered nodes | Stored inventory | Every node is running |
| Online nodes | Fresh online reports | All business functionality available |
| Live / simulated | Declared runtime classification | Attested identity |
| Active repairs | Not completed/cancelled | Throughput, revenue or ETA |
| Pending events | Unacknowledged outbox records | Case saves failed |
| Oldest pending age | Oldest undelivered event age | Average transport latency |
| Request counters | Cumulative since process startup | A rate without an interval |
| Duration histogram | Bucketed service response durations | A percentile without a correct query |
| Snapshot age | Time since latest sample | Continuous coverage |
| Probe duration | One readiness check's time | Customer transaction duration |
| MCP calls/errors | One bridge process's counters | Durable organisation-wide audit |

The collector uses a debug exporter, not a retained metrics dashboard or full OTLP trace setup. Logs, events, counters and snapshots are distinct evidence sources. Do not substitute one casually for another.

## 15. Daily operating routine

At session start inspect Compose health, freshness and real versus simulated nodes. Check the repair summary and oldest pending event. Run a diagnostic when it helps investigate, not merely to create activity.

During testing use fictional records, keep case UUIDs, refresh before transitions and review exact AI write proposals. Leave approval prompts enabled and avoid granting administrative tools to a read-only analysis session.

At session end stop unneeded MCP clients, intentionally stop or retain the local stack, and back up data that matters. A screenshot/browser history is not a database backup. Follow [OPERATIONS.md](OPERATIONS.md) before updates or recovery.

## 16. Troubleshooting

| Symptom | Check | Safe action |
|---|---|---|
| Old public page | Branch, image, URL | Use the feature branch and rebuild; preserve data |
| Cannot connect | Compose state, Docker, port | Start services and inspect logs |
| 3D slow/unavailable | Graphics/browser/node count | Accessible list, filters, pause motion |
| Stale/offline tower | Heartbeat/process | Inspect that service's readiness/logs |
| Case not found in list | Filters/latest-100 scope | Clear filters or retrieve a known UUID |
| Transition rejected | Current state/version | Reread; do not skip stages |
| Saved case has no event | Outbox/registry/token | Confirm case, restore delivery |
| Replay empty | No sample or collector failure | Wait for a real sample; inspect logs |
| MCP tools missing | SDK/interpreter/config | Check initialization and stderr |
| Write tools missing | No write flag | Deliberately enable only the required layer |
| Plan expired | Five minutes/restarted process | Inspect current state before a new proposal |
| HTTP 401/403 | Bearer, Host, Origin | Correct local configuration, not security removal |

Do not repair an access error by exposing the service publicly.

## 17. Planned capabilities

The wider platform direction includes real identity/organisations, resource permissions, files, notifications, distributed tasks, AI workload placement, optional local-first storage, federation and P2P communication. The repair direction includes bookings, vehicle identity, insurer approvals, methods/evidence, parts intelligence/procurement, invoice exchange and customer access.

These are not hidden features of the current release. Gold floors and capability strings do not implement them. Identity and tenant/resource policy are prerequisites for real multi-organisation use, regardless of how complete the UI appears.

## 18. Glossary

**Canopy:** operations interface. **Node:** registered service/runtime identity. **Manifest:** declared properties. **Heartbeat:** liveness/status report. **Outbox:** durable event awaiting delivery. **SSE:** browser server-sent events. **Snapshot:** saved observation at a known time. **MCP:** AI-host protocol for tools/resources/prompts. **Stdio:** local process standard input/output transport. **Streamable HTTP:** HTTP MCP transport. **Confirmation plan:** exact temporary write proposal. **Optimistic concurrency:** reject a write when the reviewed version changed. **Tenant:** organisation isolation boundary, not implemented here. **OTLP:** OpenTelemetry Protocol; complete cross-service trace export remains future work.
