# Jungle Core

Jungle Core is the reusable application platform underneath Jungle Computing applications.

The original Jungle Computing concept remains important: devices are towers, local clusters become cities, governed/federated clusters become islands, and communication can occur through direct, relayed, local-first and centrally coordinated paths.

Jungle Core turns that concept into an implementable platform.

## Core principle

> **If Jungle cannot observe it, Jungle should not operate it.**

Observability, measurement and visual administration are not add-ons. They are foundation capabilities alongside identity, data, communication and compute.

The administrator should be able to see the platform as a living system and move continuously between:

- business activity,
- application activity,
- services,
- requests and traces,
- events and queues,
- devices/nodes,
- compute and storage,
- network connections,
- security decisions,
- costs and capacity.

The visual metaphor used by the Jungle Computing concept site therefore becomes a real operational interface rather than only a simulation.

## Documentation

1. [Jungle Core v0.1 Architecture](01-jungle-core-v0.1.md)
2. [Observation Plane and Telemetry](02-observation-plane.md)
3. [Canopy Admin Experience](03-canopy-admin-experience.md)
4. [Reference Implementation Roadmap](04-reference-implementation-roadmap.md)

## Initial contracts

Machine-readable platform contracts begin under `core/contracts/`.

The first two contracts are:

- `node-manifest.schema.json` — how a Jungle node describes itself and its capabilities.
- `platform-event.schema.json` — common envelope for auditable platform and business events.

These contracts are intentionally technology-neutral. Implementations may be Rust, TypeScript, WebAssembly, browser code, native services or external applications as long as they honour the contract.

## First reference application

The collision repair network/Repair Passport concept should become Jungle Core's first serious reference workload.

It will exercise:

- organisations and users,
- permissions,
- vehicles and repair cases,
- bookings,
- events,
- files/evidence,
- notifications,
- APIs,
- integrations,
- real-time monitoring,
- AI/MCP tools.

Reusable capabilities should be promoted into Jungle Core rather than implemented as repair-specific infrastructure.