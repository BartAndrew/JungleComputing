# Canopy — Jungle Admin and Operations Experience

## Purpose

**Canopy** is the visual administration, operations and observability experience for Jungle Computing.

It is not just a dashboard.

Canopy should let an administrator understand the platform at multiple levels of abstraction:

```text
Business outcome
   ↓
Application
   ↓
Workflow / transaction
   ↓
Service
   ↓
Node / runtime
   ↓
Infrastructure / network
```

The interface should preserve the existing Jungle visual language — towers, cities, islands, bridges and live flows — but connect those visuals to real telemetry.

## 1. Primary operator questions

Canopy should answer these within a few clicks:

- Is Jungle healthy?
- Which applications are healthy/degraded?
- What is happening right now?
- Which nodes are connected?
- Which services are talking to each other?
- Where is work being processed?
- Which queues are backing up?
- Which integrations are failing?
- What changed recently?
- Which tenants/customers are impacted?
- Which workflows are slow?
- Where are errors occurring?
- What resources are approaching capacity?
- What is generating cost?
- What is an AI agent doing?
- What happened immediately before an incident?

## 2. Home view — Living Jungle

The default admin home should be a live topology view.

At low scale it can show individual towers.

At high scale it should aggregate intelligently:

```text
Global / Federation
   ↓
Island
   ↓
City / Site / Cluster
   ↓
Application / Service Group
   ↓
Node / Instance
```

The operator should zoom semantically rather than simply zooming a giant canvas.

### Home status strip

Always-visible summary metrics:

- platform health;
- active incidents;
- SLOs at risk;
- connected nodes;
- active users/sessions;
- requests or events per second;
- error rate;
- p95 latency;
- queued work;
- resource pressure;
- current deployments;
- estimated current infrastructure/AI spend rate where available.

## 3. Live visual encoding

The topology should favour clarity over spectacle.

### Tower height

Can optionally represent relative capability/capacity, but must be toggleable because not every operational view needs capacity encoding.

### Tower floors

Represent major functional layers/services on a node.

Clicking a floor can drill into:

- workload/service health;
- version;
- request activity;
- errors;
- traces;
- logs.

### Bridges

Represent observed communication/dependency relationships.

Selectable encodings:

- request volume;
- event volume;
- network bytes;
- latency;
- errors.

### Pulses

Use sampled events/traces to provide a sense of live activity.

Never try to animate all production traffic.

### Heat/saturation overlay

Nodes can show CPU/GPU/memory/queue/resource pressure through a selectable overlay.

### Status

Every visual state must include label/icon support and not rely solely on colour.

## 4. Operational modes

Canopy should provide purpose-specific modes rather than displaying all telemetry at once.

### Health

Focus:

- SLOs;
- availability;
- errors;
- latency;
- saturation;
- incidents.

### Traffic

Focus:

- request/event volume;
- service dependencies;
- external integrations;
- active workflows.

### Compute

Focus:

- CPU/GPU;
- workers;
- job placement;
- AI inference;
- queue depth;
- distributed workloads.

### Data

Focus:

- database health;
- storage usage;
- replication/sync lag;
- files;
- local replicas;
- island synchronization.

### Security

Focus:

- authentication activity;
- policy denials;
- privileged admin actions;
- unusual service identities;
- agent delegation;
- security alerts.

### Business

Focus on application-specific KPIs overlaid on platform health.

For Repair Network, examples include:

- repair cases active;
- bookings today;
- booking failure rate;
- average time to appointment;
- evidence completeness;
- parts quote throughput;
- integration lag.

### Cost

Focus:

- compute usage;
- storage;
- network;
- AI model usage;
- third-party calls;
- allocation by app/environment/tenant where safe.

## 5. Node Inspector

Clicking any node/tower opens a unified inspector.

Sections:

### Identity

- node ID;
- node type/roles;
- hostname/display name;
- site/city/island;
- environment;
- application owner;
- labels.

### Runtime

- software version;
- deployment time;
- uptime;
- enabled capabilities;
- configuration revision.

### Health

- current state;
- last heartbeat;
- CPU/memory/GPU;
- storage;
- queue/job pressure;
- SLO contribution.

### Connectivity

- upstream/downstream dependencies;
- active peers;
- gateways;
- message/request volumes.

### Activity

- current/recent jobs;
- recent business/platform events;
- recent traces;
- recent errors.

### Change history

- deployments;
- configuration changes;
- feature flag changes;
- node registration changes.

## 6. Workflow / transaction view

Canopy must make one business action traceable across the platform.

Example:

```text
Customer asks for appointment
  ↓
Repair API receives request
  ↓
Identity / permission check
  ↓
Capacity search
  ↓
Repairer integration query
  ↓
Booking created
  ↓
booking.confirmed event
  ↓
Notification job
  ↓
SMS/email provider
```

The view should show:

- elapsed time;
- each component;
- success/failure;
- retries;
- async handoffs;
- relevant events;
- redacted/safe business context;
- exact trace/log links.

This is one of Jungle's most important operational capabilities.

## 7. Timeline

Every major resource should have a timeline.

Examples:

- node timeline;
- application timeline;
- incident timeline;
- repair-case timeline;
- deployment timeline.

Timeline events may combine:

- platform events;
- audit events;
- deployments;
- alerts;
- business events;
- sampled traces.

This makes causal investigation much easier.

## 8. Incident workspace

An alert should open an incident context rather than a generic dashboard.

The incident workspace includes:

- affected SLO/capability;
- start time;
- impact;
- suspected services/nodes;
- related deployments/config changes;
- error-rate and latency changes;
- representative failed traces;
- relevant logs;
- active alerts;
- operator notes/actions;
- resolution event.

Later, an AI operations agent can summarise this evidence and suggest hypotheses, but source telemetry should always be inspectable.

## 9. Search and command

Canopy needs global search for:

- application;
- service;
- node ID;
- trace ID;
- job ID;
- event ID;
- organisation;
- authorised business resource ID.

A command interface can later support natural language such as:

> Show me why booking confirmations became slower after 14:00.

> Which nodes are running the previous release?

> Show failed jobs caused by the supplier integration today.

> Which AI agent executed this action?

The natural-language interface must resolve to inspectable queries and evidence.

## 10. Admin actions

Canopy will eventually perform control-plane operations, but viewing and controlling should remain clearly distinct.

Possible actions:

- drain/disable node;
- restart/redeploy service through the deployment controller;
- pause/resume queue consumer;
- replay a permitted event/job;
- change feature flag;
- revoke session/service credential;
- change node labels/capabilities;
- acknowledge/resolve incident.

High-impact actions require:

- explicit confirmation;
- strong permissions;
- audit event;
- actor identity;
- reason/comment where appropriate.

AI should not silently execute these actions.

## 11. Multi-tenant visibility

Platform administrators may see cross-tenant operational telemetry.

Tenant/application administrators should see only their permitted resources.

Canopy therefore needs the same policy engine as the rest of Jungle.

Telemetry access must not become a side channel for accessing customer data.

## 12. Mobile / wallboard / desktop

### Desktop

Full operations experience with topology, inspectors, traces and administration.

### Tablet/mobile

Incident awareness, health, alerts, key metrics, node lookup and safe limited admin actions.

### Wallboard / NOC mode

Large, passive view showing:

- platform health;
- incidents;
- major traffic flows;
- deployments;
- capacity;
- SLO status.

## 13. Simulation versus live mode

The existing Jungle simulation should remain useful.

Canopy can support:

- **Simulation Mode** — demo/synthetic network data;
- **Local Development Mode** — telemetry from a developer's running Jungle stack;
- **Live Mode** — authenticated production telemetry.

The UI must always label which mode is active.

## 14. MVP Canopy

Canopy v0.1 only needs to prove the operating model.

First screens/capabilities:

1. platform overview;
2. live node/service topology;
3. node inspector;
4. service golden signals;
5. event activity stream;
6. trace explorer/link-out;
7. queue/jobs view;
8. deployment/change markers;
9. basic SLO/alerts view;
10. tenant/application filter.

The visual topology should be built from real node registry and telemetry data from the first implementation, not hard-coded demo entities.