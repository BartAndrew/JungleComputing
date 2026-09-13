# Jungle Core v0.1 Architecture

## Purpose

Jungle Core is the reusable application platform beneath Jungle Computing products.

It is designed to support conventional web applications, local-first applications, distributed/edge workloads, AI agents and later federated/mesh deployments without requiring every product to rebuild identity, permissions, events, storage, telemetry and operational tooling.

The first objective is not to build every possible Jungle capability. The objective is to build a small, observable core that can support a real application and teach us which abstractions are genuinely reusable.

## Architecture principle

Jungle Core is divided into three equally important operational planes.

```text
┌─────────────────────────────────────────────────────────────┐
│                      JUNGLE APPLICATIONS                    │
│ Repair Network | PartsHub | Future Business Applications    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        CONTROL PLANE                        │
│ Identity | Organisations | Registry | Policy | Config       │
│ Scheduling | Secrets refs | Feature flags | API management  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   RUNTIME / DATA PLANE                      │
│ APIs | Events | Jobs | Files | Data | Sync | P2P/Relay      │
│ Workers | WASM | AI inference | External integrations       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    OBSERVATION PLANE                        │
│ Metrics | Traces | Logs | Events | Profiles | Topology      │
│ SLOs | Alerts | Cost | Audit | Real-time admin feed         │
└─────────────────────────────────────────────────────────────┘
```

The Observation Plane is not merely a monitoring sidecar. It is a platform contract. Every core service and every first-class Jungle application is expected to emit enough structured telemetry to explain what it is doing.

## 1. Control Plane

### 1.1 Identity

Responsibilities:

- user identity;
- service identity;
- device/node identity;
- AI-agent identity/delegation;
- sessions;
- authentication assurance;
- federation with external identity providers.

Initial approach:

- OIDC/OAuth2 compatible identity;
- WebAuthn/passkeys where practical;
- short-lived access tokens;
- service identities for machine-to-machine access.

Jungle should be able to integrate with an identity provider such as Authentik rather than building credential storage from scratch.

### 1.2 Organisations and tenancy

Jungle applications need a standard model for:

- organisation;
- organisational unit/site;
- user membership;
- role;
- service account;
- inter-organisation relationship;
- delegated access.

This is especially important for applications where a single business process crosses companies.

### 1.3 Policy and permissions

Authorisation must support more than simple admin/user roles.

Required dimensions include:

- tenant/organisation;
- resource ownership;
- relationship to an object;
- action;
- environment;
- delegated/temporary access;
- machine/agent principal.

Initial v0.1 may use RBAC plus resource-scoped permissions. The design should leave room for richer policy/relationship-based access later.

### 1.4 Node and service registry

Every participating runtime component should register a machine-readable manifest describing:

- stable identity;
- node/service type;
- environment;
- location/site/island where appropriate;
- software version;
- capabilities;
- health endpoint;
- telemetry endpoint/protocol;
- supported protocols;
- compute/storage characteristics where relevant;
- labels/tags;
- current state.

This registry drives both scheduling and the live Canopy view.

### 1.5 Configuration

Core configuration should support:

- environment-specific values;
- feature flags;
- dynamic configuration with audit history;
- safe rollout/rollback;
- references to secrets rather than secrets embedded in app configuration.

Every configuration change should produce an auditable event.

### 1.6 Workload orchestration

Jungle v0.1 should support simple jobs before sophisticated distributed scheduling.

A job includes:

- ID;
- type;
- submitting principal;
- tenant;
- requirements/capabilities;
- priority;
- status;
- target worker/node;
- start/end time;
- retry/dead-letter status;
- trace ID.

Later versions can use node capability and locality to place WebAssembly, AI or data-processing workloads on suitable nodes.

## 2. Runtime / Data Plane

### 2.1 API gateway and service interfaces

Jungle capabilities should be consumable through stable APIs.

Primary interfaces:

- HTTP/REST for broad interoperability;
- WebSocket or Server-Sent Events for real-time browser updates;
- event subscriptions/webhooks for integrations;
- MCP for AI agents;
- optional direct P2P protocols for compatible Jungle nodes.

MCP is an agent interface, not the only application integration interface.

### 2.2 Events

A platform event is a first-class object.

Examples:

```text
organisation.created
node.registered
node.health_changed
session.created
policy.denied
job.submitted
job.started
job.completed
file.stored
notification.sent
repair_case.created
booking.confirmed
```

All events use a common envelope so they can be:

- audited;
- consumed by applications;
- correlated with traces;
- visualised live;
- replayed where appropriate;
- used for analytics.

Not every telemetry log is a business event. Business/platform events are intentionally modelled and durable.

### 2.3 Data

The v0.1 reference data service should provide:

- PostgreSQL as the durable relational system of record for platform metadata;
- tenant-aware access;
- migration/versioning discipline;
- audit timestamps;
- stable IDs and external aliases;
- optional local/browser replicas for applications that need offline-first behaviour.

Local-first and CRDT capabilities remain part of Jungle's long-term architecture, but they should be introduced for use cases that justify them rather than forced into every v0.1 table.

### 2.4 Files and objects

Jungle Files should become a reusable capability for:

- object storage;
- metadata;
- tenant/resource linkage;
- versioning;
- checksum/content identity;
- malware scanning hooks;
- retention policy;
- audit;
- signed/temporary access.

Application products should not each build their own upload subsystem.

### 2.5 Jobs and queues

A common asynchronous job model is required for:

- notification delivery;
- file processing;
- imports/exports;
- image/document analysis;
- AI inference;
- integration synchronization;
- scheduled tasks.

Every queue/job must expose queue depth, age, throughput, errors and retry/dead-letter information to the Observation Plane.

### 2.6 Notifications

Reusable capability for:

- email;
- SMS;
- push/web notification;
- in-app event notification.

Applications submit intent and templates; Jungle provides delivery tracking and telemetry.

### 2.7 AI and MCP

Jungle AI capabilities should use the same identity and permission system as humans/services.

An AI agent can be authorised to:

- read selected resources;
- invoke tools;
- submit jobs;
- query telemetry;
- perform approved workflow actions.

AI access must not implicitly bypass tenant/resource permissions.

## 3. Observation Plane

The Observation Plane is specified separately because it is foundational to the product vision.

At minimum every Jungle service must emit:

- service/resource identity;
- health;
- traces for request/workflow paths;
- metrics for rate/error/duration and resource pressure;
- structured logs correlated to traces;
- deployment/version metadata;
- declared platform/business events.

The admin experience consumes this plane and turns it into the visual tower/city/island representation.

## 4. Runtime topology

Jungle does not require one topology for every application.

### Authority node

Provides one or more of:

- identity integration;
- registry;
- configuration;
- discovery;
- coordination;
- signalling;
- policy.

### Application/service node

Runs business APIs/services.

### Worker/compute node

Runs jobs, WASM or AI workloads.

### Storage/data node

Provides data/object/replication services.

### Browser/thin node

Provides user interface, local state, optional browser compute and optional peer communication.

### Gateway node

Connects a city/island/legacy system to the Jungle network.

These roles can coexist on one physical host in a small deployment.

## 5. Deployment profiles

### Developer profile

One machine can run:

- Postgres;
- event/job broker;
- object storage emulator/local store;
- Jungle Core services;
- OpenTelemetry Collector;
- local observability backends;
- Canopy admin UI.

### Small organisation profile

A few containers/services on one VM or home/server host.

### Cloud profile

Managed database/object storage plus stateless services and worker pools.

### Island/edge profile

A site can retain selected services/data/compute locally and connect to a wider authority/federation.

Jungle should make deployment topology visible rather than hiding it.

## 6. Reference technology direction

This is a starting point rather than an irreversible technology mandate.

- **Core service language:** Rust is preferred for new foundational services where its reliability, concurrency and WebAssembly ecosystem provide clear value.
- **Web/admin UI:** Dioxus is a candidate for Rust-centric UI; ordinary web technologies remain valid where ecosystem maturity is more important.
- **Database:** PostgreSQL.
- **Identity:** OIDC/OAuth2 provider integration (Authentik is a strong self-hosted candidate).
- **Telemetry contract:** OpenTelemetry / OTLP.
- **Metrics:** Prometheus-compatible backend.
- **Traces:** OpenTelemetry-compatible trace backend.
- **Logs:** structured logs exported through OpenTelemetry-compatible collection.
- **Object storage:** S3-compatible abstraction.
- **Events/jobs:** pluggable broker abstraction; keep application event contracts independent of the broker implementation.
- **Browser compute:** Web Workers, WASM and WebGPU as use cases demand.
- **P2P:** WebRTC/direct connections where they add measurable value, with relay/central coordination available.

## 7. v0.1 definition of done

Jungle Core v0.1 is real when a reference application can:

1. authenticate a user;
2. resolve their organisation and permissions;
3. create/read/update application resources through APIs;
4. store/retrieve files;
5. publish/consume a platform event;
6. submit an asynchronous job;
7. deliver a notification;
8. register a node/service;
9. emit traces, metrics and logs;
10. appear live in Canopy;
11. expose an approved capability through MCP;
12. show an operator the end-to-end trace from user action to service/job/event outcome.

The Repair Network should then implement one thin vertical slice on top of this core.