# Architecture

## Overview

Jungle Computing is designed as a layered distributed system.

The framework separates:

- foundational infrastructure,
- communication,
- synchronization,
- compute,
- and business logic.

This separation allows every node to share common capabilities while still supporting independent applications.

## Architectural Layers

## Layer 1 — Security and Trust

Purpose:

- identity,
- encryption,
- trust,
- permissions,
- signing.

Possible technologies:

- OAuth2,
- WebAuthn,
- PKI,
- JWT,
- DID,
- cryptographic signatures.

Visual metaphor:

- lowest orange basement floor.

## Layer 2 — Data and Storage

Purpose:

- local persistence,
- replication,
- synchronization,
- caching,
- offline operation.

Possible technologies:

- IndexedDB,
- OPFS,
- PouchDB,
- CouchDB sync,
- CRDTs,
- Yjs,
- Automerge.

Design principle:

Data should exist locally first.

## Layer 3 — P2P Communication

Purpose:

- direct browser communication,
- message routing,
- synchronization,
- transport.

Possible technologies:

- WebRTC DataChannels,
- WebSockets,
- QUIC,
- libp2p.

Supporting infrastructure:

- STUN,
- TURN,
- signalling servers.

## Layer 4 — Compute Abstraction

Purpose:

- workload execution,
- task distribution,
- browser compute,
- WASM execution,
- AI inference.

Possible technologies:

- WebAssembly,
- Web Workers,
- SharedArrayBuffer,
- GPU APIs,
- ONNX runtime,
- WebGPU.

## Business Layers

Everything above the foundations becomes application-specific.

Examples:

- repair management,
- AI agents,
- messaging,
- visualization,
- collaboration,
- digital twins,
- simulations.

## Node Roles

Not every node must perform every function.

## Thin Nodes

Examples:

- mobile phones,
- tablets,
- edge devices.

Responsibilities:

- visualization,
- lightweight communication,
- UI,
- small compute tasks.

## Heavy Nodes

Examples:

- desktops,
- workstations,
- home servers,
- GPU systems.

Responsibilities:

- AI inference,
- rendering,
- synchronization coordination,
- large compute workloads.

## Authority Nodes

Examples:

- bootstrap servers,
- identity services,
- relay gateways.

Responsibilities:

- discovery,
- trust establishment,
- signalling,
- federation coordination.

## Browser Constraints

Browsers are sandboxed environments.

Important constraints:

- NAT traversal,
- browser memory limits,
- background throttling,
- storage quotas,
- power usage.

The architecture must respect these limitations.

## Why WebRTC Matters

WebRTC allows browsers to communicate directly.

Key concepts:

- ICE,
- STUN,
- TURN,
- signalling,
- DataChannels.

Signalling still requires coordination.

Once established:

```text
Browser ↔ Browser
```

communication becomes direct.

## Mesh Topology

A pure fully connected mesh does not scale infinitely.

Jungle Computing therefore supports:

- local meshes,
- clustered meshes,
- hierarchical routing,
- island federation.

## Synchronization

Synchronization should avoid constant central writes.

Preferred approaches:

- eventual consistency,
- CRDTs,
- distributed logs,
- conflict-free merge models.

## Simulation First

The first implementations should focus on:

- visualization,
- simulation,
- topology,
- workload routing,
- and interaction.

The educational value is critical.
