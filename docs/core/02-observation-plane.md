# Jungle Observation Plane

## Purpose

The Observation Plane makes Jungle Computing measurable, diagnosable and visually understandable in real time.

It serves three audiences simultaneously:

- platform administrators operating Jungle itself;
- application owners operating products built on Jungle;
- AI/automation agents that need machine-readable platform state.

The guiding principle is:

> **Every meaningful action should be explainable from evidence.**

An operator should be able to answer:

- What is happening now?
- What changed?
- Which user/service/node caused it?
- Which application/customer/tenant is affected?
- Is this normal?
- Where is the bottleneck?
- What failed?
- What is it costing?
- What should I investigate next?

## 1. Telemetry standard

Jungle uses OpenTelemetry concepts and OTLP as the default telemetry contract for traces, metrics and logs.

This keeps instrumentation independent from the storage/visualisation backend.

Jungle services should emit telemetry to a local/nearby OpenTelemetry Collector whenever possible rather than directly coupling themselves to a specific commercial backend.

Conceptual flow:

```text
Application / Service / Node
          |
      OpenTelemetry
          |
          v
  OTel Collector / Gateway
   |       |        |
   v       v        v
Metrics   Traces    Logs
   \       |       /
    \      |      /
        Canopy
```

## 2. Five operational evidence types

### 2.1 Metrics

Metrics answer quantitative questions over time.

Minimum platform metrics should include:

- request rate;
- request error rate;
- request latency distribution;
- active sessions;
- node count by status/type;
- CPU/memory/GPU where available;
- storage usage;
- queue depth;
- queue oldest-message age;
- job throughput;
- job duration;
- retries and dead letters;
- event throughput;
- WebSocket/SSE connections;
- P2P connections;
- external integration success/error rate;
- notification delivery rate;
- file processing latency;
- AI token/inference usage where applicable;
- cost/usage counters where known.

Use histograms for latency and duration rather than only averages.

### 2.2 Distributed traces

Traces describe one request or workflow across components.

Every incoming API request should have a trace ID.

The trace context should propagate through:

```text
browser/user action
 -> API gateway
 -> application service
 -> database call
 -> event publication
 -> background worker
 -> external integration
 -> notification
```

Where an asynchronous event cannot retain a single synchronous span, preserve trace correlation and causation identifiers.

The operator should be able to click a live transaction in Canopy and open the trace explaining its path.

### 2.3 Structured logs

Logs provide diagnostic detail.

All production logs should be structured and include where available:

- timestamp;
- severity;
- service name;
- service version;
- deployment environment;
- node ID;
- organisation/tenant ID when safe;
- request ID;
- trace ID;
- span ID;
- event/job ID;
- error code/type;
- machine-readable attributes.

Sensitive values must not be placed into logs by default.

### 2.4 Platform and business events

Events are not merely logs.

Events represent durable facts such as:

```text
node.registered
node.disconnected
user.login_succeeded
policy.denied
job.failed
repair_case.created
booking.confirmed
part_order.placed
```

Events must include actor, subject, correlation/causation and tenant/resource context where applicable.

Canopy can render these as the real-time activity stream.

### 2.5 Audit/security evidence

Security-sensitive actions require immutable/auditable records including:

- login/session events;
- role/membership changes;
- permission changes;
- policy denials;
- secret/config references changed;
- administrative actions;
- data export/deletion requests;
- AI agent actions made on behalf of a principal.

Audit records have different retention and access requirements from debug logs.

## 3. Golden signals

Every network/service view should expose at least:

- **Traffic** — how much work is arriving;
- **Errors** — how much work fails;
- **Latency** — how long work takes;
- **Saturation** — how close the system is to its limits.

For asynchronous systems add:

- queue depth;
- queue age;
- retry rate;
- dead-letter rate.

For distributed nodes add:

- connectivity;
- sync lag;
- peer count;
- last heartbeat;
- workload availability.

## 4. Service level objectives

Important services should declare SLOs.

Example:

```text
Service: Jungle Identity
SLI: successful authenticated requests / valid auth requests
Target: 99.95% over rolling 30 days
Latency: 99% under 300ms
```

Example application SLO:

```text
Capability: Repair booking search
Availability: 99.9%
Latency: 95% under 1.5s
Correctness: no confirmed booking without durable event + audit record
```

Canopy should visualise:

- current SLO status;
- error budget remaining;
- burn rate;
- recent incidents affecting the SLO.

## 5. Cardinality discipline

Metrics can become expensive/unusable when dimensions have unbounded cardinality.

Rules:

- do not use user ID, request ID, VIN, job ID, repair-case ID or raw URL as ordinary metric labels;
- place high-cardinality values in traces/logs/events;
- metrics use bounded dimensions such as service, environment, route template, region, status class, node role and error category;
- every new metric label must have an expected maximum cardinality documented.

This should be enforced in code review and platform libraries.

## 6. Semantic resource identity

Every telemetry item should identify the resource producing it.

Minimum resource attributes:

```text
service.name
service.version
deployment.environment.name
jungle.node.id
jungle.node.role
jungle.island.id          (optional)
jungle.city.id            (optional)
jungle.application.id     (where applicable)
```

Tenant/customer identifiers should only be added where access controls and privacy rules permit.

## 7. Real-time topology

Canopy's topology is generated from real state rather than manually drawn diagrams.

Inputs include:

- node registry;
- heartbeats;
- service dependencies observed in traces;
- active peer/WebSocket connections;
- deployment metadata;
- event-broker topology;
- data/storage relationships;
- application ownership.

A node's visual state can represent:

```text
Healthy       green marker + normal tower illumination
Degraded      amber marker + pulsing affected layer
Critical      red marker + clear error indicator
Disconnected  grey/dim tower
Deploying     animated version/change marker
High load     saturation overlay
Incident      incident badge
```

Do not rely on colour alone; state labels/icons are required.

## 8. Jungle visual mapping

The existing Jungle metaphor becomes operational.

### Tower

A service, runtime node or device.

Inspecting it shows:

- identity;
- version;
- owner/application;
- roles/capabilities;
- health;
- resource pressure;
- current work;
- dependencies;
- recent deploy/config changes;
- recent errors;
- traces/logs/events.

### City

A local cluster/site/deployment grouping.

Examples:

- repair branch;
- warehouse;
- developer laptop environment;
- Kubernetes namespace/cluster grouping;
- home compute environment.

### Island

A governed/federated boundary such as organisation, geography, data-residency zone or independently operable cluster.

### Bridges/beams

Observed communication between nodes/islands.

Line thickness can encode traffic volume; interaction selects exact metrics rather than expecting colour intensity alone to communicate meaning.

### Packets/pulses

Sampled live events/traces, never every production packet at high volume.

## 9. Sampling

Jungle should preserve useful diagnostics without attempting to retain everything forever.

Recommended approach:

- metrics: aggregate all expected metric points;
- traces: head/tail sampling depending on environment;
- retain 100% of errors/high-latency/important business workflows when feasible;
- logs: severity-aware retention;
- audit/business events: durable according to business/retention policy.

Sampling decisions must be transparent in Canopy so absence of a trace is not mistaken for absence of activity.

## 10. Alerting

Alerts should be actionable.

Avoid alerts merely because a metric crossed a static threshold if there is no operator action.

Initial alert classes:

- SLO burn rate;
- service unavailable;
- queue stalled/oldest age;
- error-rate anomaly;
- resource saturation;
- integration failure spike;
- node/island disconnected unexpectedly;
- certificate/credential expiry;
- storage capacity risk;
- security policy anomaly.

Each alert should link directly to the relevant Canopy context, metrics and traces/logs/events.

## 11. Change correlation

Every deploy, configuration change, feature-flag change and dependency version should produce an event.

Canopy overlays changes on latency/error charts and incident timelines.

A core question should be easy to answer:

> **What changed immediately before this started?**

## 12. Business observability

Jungle must connect technical behaviour with business outcomes without leaking private data.

Examples for the Repair Network:

- bookings requested/confirmed/failed;
- time to first appointment;
- repair cases created;
- active repair cases;
- evidence items uploaded;
- estimate/approval turnaround;
- parts quote response time;
- automation/manual-exception ratio;
- customer status views;
- integration lag.

Business metrics should use bounded aggregation dimensions. Individual cases remain accessible through authorised event/trace/resource views rather than becoming high-cardinality metrics labels.

## 13. Cost and efficiency telemetry

Where infrastructure providers expose usage/cost, Jungle should ingest it.

At minimum estimate/measure:

- compute time;
- storage consumed;
- network transfer;
- AI inference/tokens/GPU time;
- third-party API calls;
- notification cost;
- per-application/tenant allocation where reasonably attributable.

Canopy should eventually answer:

> What is consuming resources, what value/workload is driving it, and is that trend healthy?

## 14. Technology independence

The reference stack may use Prometheus-compatible metrics and Grafana ecosystem components, but Jungle's contract is OpenTelemetry/OTLP plus its own platform event schemas.

This means backends can later be swapped without rewriting every application.

## 15. Definition of observable

A new Jungle service is not production-ready until an operator can:

1. see whether it is healthy;
2. see its current traffic/error/latency/saturation;
3. discover what depends on it and what it depends on;
4. find a failing request/job trace;
5. correlate logs to that trace;
6. see which version/configuration is running;
7. see important platform/business events it produces;
8. understand relevant SLO status;
9. identify the tenant/application impact safely;
10. see it in Canopy.