# Jungle Computing Documentation Hub

Welcome to the design documentation for **Jungle Computing**: a browser-first, peer-to-peer computing framework and visual language where computers become buildings, local clusters become cities, and federated sites become islands connected across a wider network.

This documentation set is designed to support the GitHub Pages site and the implementation roadmap. It explains the concept from first principles, moving from today's monolithic web model into a mesh of browser clients, local compute clusters, shared foundation layers, and optional authority services for discovery, identity, and signalling.

## Documentation map

1. [Concept Overview](01-concept-overview.md)  
   What Jungle Computing is, why it exists, and how the city metaphor works.

2. [From Monolith to Mesh](02-from-monolith-to-mesh.md)  
   A walkthrough from conventional centralized web applications to peer-to-peer browser networks.

3. [Architecture](03-architecture.md)  
   The layers, runtime roles, signalling, mesh routing, local-first data, authority services, and browser constraints.

4. [Visual Language and UX](04-visual-language-and-ux.md)  
   How the website should teach the concept through towers, foundations, cities, islands, parallax, Three.js, and interactive states.

5. [Web Page Design Brief](05-github-pages-design-brief.md)  
   A concrete static GitHub Pages design brief for the interactive website.

6. [Simulation Specification](06-browser-simulation-spec.md)  
   A browser-only simulation that demonstrates Jungle Computing using JavaScript, Three.js, local state, and optional WebRTC concepts.

7. [Island Computing](07-island-computing.md)  
   How Jungle Computing expands from one local mesh into multiple clustered islands and federated regions.

8. [Benefits and Use Cases](08-benefits-use-cases.md)  
   Why this approach matters, where it helps, and where it should not be used blindly.

9. [Research and Related Work](09-research-related-work.md)  
   Papers, standards, and adjacent projects that support the underlying ideas.

10. [Implementation Roadmap](10-implementation-roadmap.md)  
   A staged plan for turning the concept page into an interactive demo and later a working framework.

11. [Jungle Core](core/README.md)  
   The production application-platform design: control plane, runtime/data plane, observability, Canopy administration, platform contracts, and the first reference implementation roadmap.

## Core idea

Most web applications today are designed as a central server plus a database, with browsers acting as mostly thin clients. Jungle Computing turns that model around. The browser becomes an active participant: a compute node, data replica, communication peer, visualization surface, and sometimes even an AI endpoint.

A small centralized authority may still exist, but its role is reduced. It should help nodes discover one another, establish trust, and initiate connections. It should not become the place where all business value, application state, and compute must permanently live.

## From concept to platform

The original architecture and simulation remain the long-term distributed-computing direction. **Jungle Core** now defines the pragmatic production platform used to build real applications while that direction evolves.

Jungle Core has three first-class planes:

- **Control Plane** — identity, organisations, policy, registry, configuration and orchestration.
- **Runtime / Data Plane** — APIs, events, jobs, files, data, sync, integrations and compute.
- **Observation Plane** — metrics, traces, logs, platform/business events, topology, SLOs, alerts, audit and cost/capacity measurement.

The existing tower/city/island visual language becomes the basis of **Canopy**, the live administrator experience. In live mode, towers and connections should represent actual registered nodes, dependencies and telemetry rather than hard-coded simulation data.

## Visual metaphor

- **Computer / browser client** = a tower.
- **Shared foundation layers** = four orange/gold basement levels.
- **Business/application layers** = blue/cyan upper floors.
- **Peer-to-peer communication** = neon beams between buildings.
- **Local cluster / LAN / site** = a city.
- **Regional cluster / WAN / federated group** = an island.
- **Global system** = many islands connected by controlled, encrypted bridges.

## GitHub Pages constraints

The public website should work as a static site:

- HTML, CSS, JavaScript.
- Three.js loaded locally or by CDN.
- No paid hosting requirement.
- No persistent backend required for the first demo.
- Simulation mode first, real WebRTC signalling later.
- Optional WebSocket/WebRTC examples should be clearly marked as future/live mode.

The production Canopy application is separate from this public static-site constraint and may connect to real Jungle Core APIs and telemetry services.

## Recommended site structure

```text
/
  index.html
  style.css
  script.js
  assets/
    img/
    models/
    data/
  docs/
    README.md
    core/
    01-concept-overview.md
    02-from-monolith-to-mesh.md
    ...
  core/
    contracts/
```

## Status

The original documentation describes the target concept and design direction. The new `docs/core/` documentation begins the production architecture. The immediate implementation priority is an **observable skeleton**: node registry, health/heartbeat, OpenTelemetry collection and a minimal Canopy view driven by real telemetry before building the Repair Network vertical slice.