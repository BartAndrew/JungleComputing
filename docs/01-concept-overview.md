# Concept Overview

## What is Jungle Computing?

Jungle Computing is a browser-first, peer-to-peer distributed computing framework and visualization model.

Instead of treating browsers as passive front ends connected to a central server, Jungle Computing treats every participating device as an active compute node capable of:

- processing workloads,
- storing synchronized state,
- communicating directly with peers,
- rendering distributed system topology visually,
- participating in mesh routing,
- and potentially contributing AI inference, storage, or rendering capacity.

The framework combines:

- WebRTC,
- local-first architecture,
- peer-to-peer networking,
- distributed synchronization,
- browser compute,
- visualization systems,
- and optional authority services.

## The Core Metaphor

Jungle Computing represents computers as buildings.

### Tower = Computer

Every device in the network becomes a tower.

The larger the tower:

- the more compute,
- memory,
- storage,
- bandwidth,
- or AI capability it has.

### Basement Floors = Shared Foundations

Every tower contains the same four foundational basement levels.

These orange and gold glowing levels represent:

1. Security and trust
2. Data and storage
3. Peer-to-peer communication
4. Compute abstraction

These layers are shared across all nodes.

## Upper Floors = Business Logic

The upper blue and cyan floors differ between towers.

These represent:

- applications,
- workflows,
- AI agents,
- rendering systems,
- APIs,
- databases,
- and services.

No two towers need to look identical above the foundation.

## Cities and Islands

### City

A city represents a local cluster of devices.

Examples:

- a home network,
- a repair workshop,
- an office,
- a warehouse,
- a school,
- or a datacenter.

Within a city:

- latency is low,
- communication is dense,
- and synchronization is fast.

### Island Computing

Island Computing extends Jungle Computing.

Multiple cities become islands.

An island may represent:

- an enterprise region,
- a workshop group,
- a WAN segment,
- or an isolated sovereign compute zone.

Islands communicate through controlled gateways rather than unrestricted global flooding.

## Why Build This?

Modern web applications are heavily centralized.

Typical architecture:

```text
Browser -> API Server -> Database
```

This creates:

- central bottlenecks,
- cloud cost concentration,
- scaling pressure,
- outages,
- data ownership problems,
- and offline limitations.

Jungle Computing attempts to reverse that model.

The browser becomes:

- a participant,
- a worker,
- a replica,
- a renderer,
- and a peer.

## Design Goals

- Browser-first
- Offline capable
- Local-first
- Mesh connected
- Scalable
- Visual
- Distributed
- Federated
- Secure
- Simulation friendly
- GitHub Pages compatible

## Important Constraint

Jungle Computing is not anti-server.

Instead:

- centralized infrastructure should become optional,
- minimized,
- and specialized.

Servers should help:

- coordinate,
- authenticate,
- signal,
- discover,
- and bridge.

They should not always carry the full application load.
