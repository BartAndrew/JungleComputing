# Jungle Core Reference Implementation Roadmap

## Goal

Build Jungle Core by using a real application rather than by completing an abstract framework in isolation.

The Repair Network becomes the first serious reference workload.

## Stage 0 — Repository and contracts

Create the core structure and machine-readable contracts.

Deliverables:

- `docs/core/` architecture and operations documents;
- `core/contracts/node-manifest.schema.json`;
- `core/contracts/platform-event.schema.json`;
- service naming/resource attribute conventions;
- telemetry naming conventions;
- local developer environment definition.

Exit criterion:

A developer can understand what a Jungle node/service must declare and what a Jungle platform event looks like.

## Stage 1 — Observable skeleton

Build the smallest working platform loop.

Components:

- node registry;
- heartbeat/health service;
- PostgreSQL metadata store;
- OpenTelemetry Collector;
- Prometheus-compatible metrics backend;
- trace backend;
- log backend;
- minimal Canopy web UI;
- real-time stream from registry/events to Canopy.

Canopy must show real telemetry from day one.

Exit criterion:

Start two Jungle services and one worker. Canopy automatically discovers/displays them, their versions, health, traffic and a sample trace.

## Stage 2 — Identity and organisations

Components:

- OIDC integration;
- Authentik reference deployment/configuration;
- users;
- organisations;
- memberships;
- roles;
- service accounts;
- resource permissions;
- audit events.

Canopy additions:

- active sessions;
- authentication success/failure;
- policy denials;
- organisation/application filtering.

Exit criterion:

A user logs in, accesses an organisation-scoped resource, and an administrator can trace authentication/authorisation decisions without seeing inappropriate secret/customer data.

## Stage 3 — Events and jobs

Components:

- event broker abstraction;
- platform-event envelope;
- job submission;
- workers;
- retry/dead-letter handling;
- correlation/causation IDs.

Canopy additions:

- real-time event feed;
- queue depth/age;
- job inspector;
- failed/retried/dead-letter job views;
- trace/event correlation.

Exit criterion:

A web/API action creates an event, triggers an async job, and the entire journey is visible in Canopy.

## Stage 4 — Files and notifications

Components:

- S3-compatible object abstraction;
- metadata/permissions;
- upload lifecycle;
- processing hooks;
- notification service;
- email first, SMS adapter second.

Canopy additions:

- storage/processing metrics;
- notification delivery metrics;
- failed notification inspection;
- object processing traces.

Exit criterion:

A user uploads an evidence file, it is processed/stored, an event is emitted, and a notification is delivered with complete traceability.

## Stage 5 — Repair Network vertical slice

Implement only enough Repair Network functionality to prove the platform.

Entities:

- customer/user;
- organisation/repairer;
- repair site;
- vehicle;
- repair case;
- repairer capabilities;
- capacity slot;
- booking.

Workflow:

```text
Authenticate
  -> identify/create vehicle
  -> create repair case
  -> search repairers/capacity
  -> choose slot
  -> confirm booking
  -> emit booking event
  -> notify parties
```

Canopy business view:

- repair cases created;
- booking search rate;
- successful bookings;
- failed bookings;
- booking latency;
- time-to-appointment distribution;
- repairer integration health.

Exit criterion:

The end-to-end booking scenario works through Jungle Core and is visually explainable from customer action to final event/notification.

## Stage 6 — MCP / AI tool plane

Expose carefully scoped tools such as:

- search repairers;
- search capacity;
- create draft repair case;
- create booking after explicit approval;
- query authorised repair-case status;
- query Canopy operational data.

Requirements:

- delegated identity;
- permission checks;
- tool-call traces;
- actor/agent audit trail;
- approval gates for high-impact actions.

Canopy additions:

- AI/agent activity view;
- tool calls and latency;
- model/provider usage;
- error and approval rate;
- token/GPU/cost usage where available.

Exit criterion:

An authorised agent can complete the booking workflow through tools and every action is attributable and inspectable.

## Stage 7 — Local-first and distributed compute experiments

Only after the central/reference application loop is working reliably:

- browser local replicas;
- offline operation;
- CRDTs where justified;
- WebRTC/direct node communication;
- WASM workers;
- WebGPU/local inference;
- island gateway/federation experiments;
- workload placement based on node capability/locality.

Canopy becomes the measurement framework for deciding whether each distributed capability actually improves:

- latency;
- resilience;
- cloud cost;
- privacy/data locality;
- user experience.

No distributed architecture feature should be adopted simply because it is technically interesting.

## Suggested monorepo target

The current public concept/demo assets can remain while implementation grows alongside them.

Proposed future structure:

```text
/
  docs/
    core/
  core/
    contracts/
    crates/
      jungle-identity/
      jungle-registry/
      jungle-events/
      jungle-jobs/
      jungle-telemetry/
      jungle-files/
  apps/
    canopy/
    repair-network/
  deploy/
    local/
    docker/
    authentik/
    otel/
  examples/
  assets/
```

Do not restructure the existing site until the implementation work needs it; avoid breaking the current concept/demo while defining the core.

## First implementation backlog

Priority order:

1. node manifest contract;
2. platform event contract;
3. telemetry resource conventions;
4. local Docker/dev stack;
5. node registry + heartbeat API;
6. OTLP collection;
7. real service/node health metrics;
8. Canopy topology from registry data;
9. trace one request end-to-end;
10. identity integration;
11. organisation/resource model;
12. event broker + live event feed;
13. job worker + queue telemetry;
14. Repair Network booking vertical slice.

## Key design rule

Every stage must add both **functionality** and **measurement**.

A feature is incomplete if the administrator cannot determine whether it is working, how well it is working, and what it is affecting.