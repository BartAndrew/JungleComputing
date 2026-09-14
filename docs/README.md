# Jungle Computing Documentation Hub

Welcome to the design documentation for **Jungle Computing**: a browser-first, peer-to-peer computing framework and visual language where computers become buildings, local clusters become cities, and federated sites become islands connected across a wider network.

## Use the running development platform

For current hands-on instructions, start with the **[User Manual and Documentation Library](manual/README.md)** rather than assuming every capability in the architecture vision is implemented.

- [Detailed User Manual](manual/USER_MANUAL.md): installation, 3D Canopy, monitoring, replay, diagnostics, Repair Network workflows and troubleshooting.
- [Direct AI / MCP Guide](manual/MCP_GUIDE.md): separate platform and Repair Network servers, client setup, complete tools, approval controls and deployment boundaries.
- [Operations and Recovery](manual/OPERATIONS.md): logs, incidents, backups, restores, updates and retention.
- [Developer and API Reference](manual/DEVELOPER_GUIDE.md): source layout, routes, extension rules and tests.
- [Release Scope and Verification](manual/RELEASE_STATUS.md): what exists, what has been checked and what is not yet production-ready.
- [Core Quickstart](../core/README.md) and [MCP Implementation](../core/mcp/README.md).

The current application is a loopback-only development stack on `build/jungle-core-v0.1`. Use fictional data. No user identity, tenant isolation, insurer integration, public deployment or automatic connection to this ChatGPT conversation is implied by the design documents below.

## Design documentation

This documentation set also supports the GitHub Pages concept site and implementation roadmap. It explains the long-term direction from conventional centralized applications to browser clients, local compute clusters, shared foundation layers and optional discovery/identity/signalling authorities.

### Documentation map

1. [Concept Overview](01-concept-overview.md)  
   What Jungle Computing is, why it exists, and how the city metaphor works.

2. [From Monolith to Mesh](02-from-monolith-to-mesh.md)  
   A walkthrough from conventional centralized web applications to peer-to-peer browser networks.

3. [Architecture](03-architecture.md)  
   Layers, runtime roles, signalling, local-first data, authority services and browser constraints.

4. [Visual Language and UX](04-visual-language-and-ux.md)  
   Towers, foundations, cities, islands, parallax, Three.js and interactive states.

5. [Web Page Design Brief](05-github-pages-design-brief.md)  
   Planned static GitHub Pages design brief.

6. [Simulation Specification](06-browser-simulation-spec.md)  
   Planned browser simulation specification.

7. [Island Computing](07-island-computing.md)  
   Planned federation and regional-cluster design.

8. [Benefits and Use Cases](08-benefits-use-cases.md)  
   Planned use-case discussion and limitations.

9. [Research and Related Work](09-research-related-work.md)  
   Planned supporting standards and related work.

10. [Implementation Roadmap](10-implementation-roadmap.md)  
    Planned staged implementation roadmap.

11. [Jungle Core](core/README.md)  
    Application-platform design: control/runtime/observation planes, Canopy, contracts and reference implementation.

Some entries in the original design map are planned documents and may not exist yet. The operational manual library above is the current implemented-use reference.

## Core idea

Most conventional web applications use a central server/database with browsers as thin clients. Jungle's long-term direction makes the browser a possible compute node, local data replica, communication peer, visualisation surface and AI endpoint.

A centralized authority can still help nodes discover one another, establish trust and initiate connections. The goal is to move suitable work closer to participants, not to impose a peer-to-peer topology on every workload before it is justified.

## From concept to platform

The original architecture and simulation remain the distributed-computing direction. Jungle Core defines the pragmatic platform beneath real applications while that direction evolves.

- **Control Plane**: identity, organisations, policy, registry, configuration and orchestration.
- **Runtime / Data Plane**: APIs, events, jobs, files, data, sync, integrations and compute.
- **Observation Plane**: metrics, traces, logs, business/platform events, topology, SLOs, alerts, audit and capacity/cost.

These are design categories, not a checklist of already implemented services. The user manual and release status state the narrower current implementation. Live towers use actual registrations; registry links are schematic relationships, not measured P2P traffic.

## Visual metaphor

- **Computer/browser client** = tower.
- **Shared foundation layers** = four orange/gold basement levels.
- **Business/application layers** = blue/cyan upper floors.
- **Peer-to-peer communication vision** = beams between buildings.
- **Local site/cluster** = city.
- **Federated group** = island.
- **Wider system** = connected islands under governed boundaries.

Current city/island labels and gold floors are explanatory, not enforcement or security attestations.

## Public static site versus operational app

The public concept site can remain HTML/CSS/JavaScript with local or CDN visualisation libraries. It has no requirement for a persistent backend and can demonstrate clearly labelled simulations. GitHub Pages cannot run the registry, PostgreSQL, application workers or MCP servers.

The operational Canopy app is served by Jungle's development stack and reads actual registered state. Its 3D rendering, replay and diagnostics are separate from the educational public site.

## Repository orientation

```text
index.html, style.css, script.js     public concept site
assets/                            visual assets
docs/                              concept/design documentation
docs/core/                         platform architecture
docs/manual/                       current user/AI/operations/developer guides
core/                              runnable local reference stack
core/mcp/                          platform and Repair Network AI interfaces
```

## Status

The reference implementation now includes a registry, real Repair Network case workflow, observable event exchange, Network Observatory and local MCP interfaces. It remains development-only. Consult [release evidence](manual/RELEASE_STATUS.md) and exact-commit GitHub Actions before treating an implemented capability as tested or deployed.
