# From Monolith to Mesh

## Traditional Web Architecture

Most modern web applications still follow a centralized model.

```text
Browser
   ↓
Web Server / API
   ↓
Database
```

The browser is usually passive.

The server:

- owns state,
- processes logic,
- stores data,
- and coordinates communication.

This model works well for many use cases.

However it creates limitations.

## Problems with Centralized Systems

### Scaling Bottlenecks

As more users connect:

- compute pressure increases,
- database pressure increases,
- network pressure increases.

Scaling requires:

- larger servers,
- more cloud infrastructure,
- and higher costs.

## Latency

All communication routes through centralized infrastructure.

Even local users may need to communicate through distant cloud services.

## Offline Limitations

Many systems stop functioning without internet connectivity.

## Vendor Lock-In

Centralized architectures often depend heavily on:

- cloud providers,
- proprietary APIs,
- centralized identity systems,
- and managed infrastructure.

## Jungle Computing Direction

Jungle Computing changes the role of the browser.

Instead of:

```text
Thin client
```

the browser becomes:

```text
Active peer
```

Each browser may:

- process data,
- synchronize state,
- route messages,
- contribute compute,
- store replicas,
- render distributed topology,
- and participate in AI workloads.

## Hybrid Architecture

Jungle Computing is not fully decentralized chaos.

Instead it uses a hybrid structure.

```text
Authority Services
    ↓
Peer Discovery
    ↓
Direct Browser Connections
```

## Authority Services

A small centralized authority may still exist.

Examples:

- identity providers,
- WebRTC signalling servers,
- discovery registries,
- TURN relays,
- bootstrap coordinators.

These services help establish trust and connectivity.

They are intentionally minimized.

## Mesh Communication

After peers discover one another:

```text
Browser ↔ Browser
```

communication becomes direct.

This can use:

- WebRTC DataChannels,
- WebSockets,
- CRDT synchronization,
- distributed logs,
- or future browser-native mesh protocols.

## Local-First Philosophy

Jungle Computing strongly aligns with local-first ideas.

Data should:

- exist locally first,
- synchronize opportunistically,
- and remain useful offline.

This improves:

- resilience,
- responsiveness,
- and ownership.

## Example Evolution

### Stage 1

Traditional app:

```text
Browser → Server → Database
```

### Stage 2

Enhanced app:

```text
Browser ↔ Signalling Server
Browser ↔ Browser
```

### Stage 3

Distributed mesh:

```text
Peer ↔ Peer ↔ Peer ↔ Peer
```

### Stage 4

Island federation:

```text
City ↔ Island ↔ Regional Federation
```

## Why the Visual Metaphor Matters

Distributed systems are difficult to understand.

Jungle Computing makes them visible.

Users can:

- see workloads,
- see relationships,
- understand topology,
- and explore network behavior spatially.

The system becomes:

- educational,
- interactive,
- and intuitive.
