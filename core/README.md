# Jungle Core v0.1 — Observable Skeleton

This directory is the first runnable implementation of Jungle Core.

The objective of this slice is deliberately small:

> Start Jungle, register nodes, receive heartbeats, observe health/resource signals, stream platform events, and render the live topology in Canopy.

## What exists now

- **Registry service** — Rust/Axum API with PostgreSQL persistence.
- **Node manifests** — stable IDs, roles, location, capabilities, version and metadata.
- **Heartbeats** — node status plus CPU/memory measurements.
- **Health detection** — nodes are marked offline after missed heartbeats.
- **Platform events** — registration, heartbeat and health-change events over SSE.
- **Prometheus metrics** — registry counters and node status gauges at `/metrics`.
- **OpenTelemetry Collector** — scrapes the registry's Prometheus telemetry.
- **Canopy** — real-time browser admin surface at `/`.
- **Simulator** — registers Authority-01, API-01 and Worker-01 and continuously sends changing measurements.

## Start it

From this directory:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

Useful endpoints:

```text
GET  /healthz
GET  /metrics
GET  /api/nodes
GET  /api/nodes/{id}
POST /api/nodes
POST /api/nodes/{id}/heartbeat
GET  /api/events
```

## Expected Canopy view

Within a few seconds the simulator should create:

- `Authority-01` in **Core City**
- `API-01` in **Core City**
- `Worker-01` in **Compute Grove**

All three live inside the **Local Jungle** island. CPU and memory values change with each heartbeat. Stop the simulator and Canopy should mark its nodes offline after approximately 20 seconds.

## Example node registration

```json
{
  "name": "Repair-Network-API-01",
  "node_type": "application",
  "environment": "development",
  "city": "Repair Network",
  "island": "Local Jungle",
  "version": "0.1.0",
  "capabilities": ["repair-case", "booking", "events"],
  "metadata": {
    "application": "repair-network"
  }
}
```

## What this proves

This is not yet the complete Jungle runtime. It proves the first operational loop:

```text
Node
  -> Registry
  -> Postgres
  -> heartbeat / measurements
  -> platform event
  -> metrics
  -> OpenTelemetry Collector
  -> Canopy live topology
```

The next implementation slice should add **identity + organisations + authenticated service identities**. After that, the first Repair Network vertical slice can register as a real Jungle application instead of a simulator.

## Deliberate limitations in v0.1

- no authentication yet;
- no tenant boundaries yet;
- event stream is in-process and not durable;
- metrics backend is not persisted yet;
- traces/logs are structured but a complete OTLP trace pipeline comes next;
- Canopy is a compact topology view, not yet the full 3D city/island experience;
- node CPU/memory values are self-reported by the simulator.

These limitations are intentional. The next versions should expand the platform while keeping the same observation contract.