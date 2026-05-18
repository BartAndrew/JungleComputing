# Visual Language and UX Design

## Purpose of this Document

This document gives the web development team a detailed design brief for the **Jungle Computing** website and interactive experience.

The goal is not just to create a landing page. The page should teach a complex architecture through progressive visual storytelling. It should help a visitor understand how Jungle Computing evolves from today’s centralized web architecture into a browser-first, peer-to-peer, mesh-connected compute network.

The target experience should feel like:

- a premium technology website,
- an interactive architecture explainer,
- a cinematic sci-fi dashboard,
- and a live simulation of a distributed compute network.

The visual style should match the Tron-like neon city imagery already developed: dark environment, electric blue upper towers, orange/gold foundational layers, glowing data beams, atmospheric haze, reflective surfaces, and premium cinematic composition.

---

## Design Intent

The website should communicate one idea clearly:

> Every computer becomes a building. Every local mesh becomes a city. Every federated cluster becomes an island. Together they form a living distributed compute ecosystem.

The user should not need to understand WebRTC, CRDTs, signalling servers, browser compute, or distributed systems before entering the page. The design should reveal these ideas step by step through animation, interaction, and layered explanation.

---

## Primary Audience

### 1. Technical audience

Developers, architects, and engineers who want to understand:

- how the framework could be built,
- where WebRTC fits,
- how browser clients become active nodes,
- how mesh messaging works,
- and how local clusters federate into wider networks.

### 2. Business / executive audience

People who need the concept explained visually:

- why this reduces central server dependence,
- why local-first/offline-first matters,
- how distributed compute scales,
- and how it could support business systems, AI, collaboration, and edge environments.

### 3. Future contributors

Designers, developers, AI agents, and open-source contributors who need to understand the product direction quickly.

---

## Overall Experience

The page should be a single-page interactive journey with major sections:

1. **The old model** — centralized web app.
2. **The problem** — bottlenecks, outages, latency, cloud dependency.
3. **The shift** — browsers become active peers.
4. **The tower model** — each computer becomes a building.
5. **The shared foundation** — orange/gold common layers.
6. **The business layers** — blue/cyan independent application floors.
7. **The city** — local mesh cluster.
8. **The island** — federated cluster of cities.
9. **The living network** — distributed, scalable, self-expanding ecosystem.
10. **The simulation** — users can interact with nodes and see messages flow.

The design should feel like the user is zooming out:

```text
Server diagram -> browser peers -> tower -> city -> island -> country-scale mesh
```

---

## Visual Identity

## Color System

### Core background

Use near-black blue tones:

```css
--bg-950: #020617;
--bg-900: #07111f;
--bg-850: #0a1628;
--panel-bg: rgba(8, 18, 34, 0.72);
--panel-border: rgba(56, 189, 248, 0.28);
```

### Primary neon blue

Represents active compute, business layers, AI, live routing, and communication.

```css
--blue-400: #38bdf8;
--blue-500: #0ea5e9;
--blue-600: #0284c7;
--cyan-glow: rgba(56, 189, 248, 0.65);
```

### Foundation orange/gold

Represents shared foundational layers: trust, storage, P2P communication, compute abstraction.

```css
--gold-300: #fbbf24;
--orange-400: #f59e0b;
--orange-500: #f97316;
--gold-glow: rgba(245, 158, 11, 0.72);
```

### Supporting colors

```css
--green-live: #22c55e;
--red-alert: #ef4444;
--purple-ai: #a855f7;
--text-main: #f8fafc;
--text-muted: #94a3b8;
--text-soft: #cbd5e1;
```

## Color Meaning

| Color | Meaning |
|---|---|
| Blue / Cyan | Active compute, application logic, messaging, AI, business layers |
| Orange / Gold | Shared foundation, security, storage, trust, base protocol |
| Green | Online, healthy, connected |
| Red | Failed, disconnected, overloaded, blocked |
| Purple | AI, inference, model routing, intelligent agents |
| White | Labels, important text, high contrast anchors |

The design must be consistent: blue always means live/active/business, orange always means foundation/shared/security.

---

## Typography

The style should feel technical, premium, and futuristic without becoming unreadable.

Recommended fonts:

- Headings: `Orbitron`, `Rajdhani`, `Space Grotesk`, or `Inter Tight`
- Body: `Inter`, `Segoe UI`, `Roboto`, or `IBM Plex Sans`
- Code/data labels: `JetBrains Mono`, `Fira Code`, or `IBM Plex Mono`

Example:

```css
:root {
  --font-display: 'Orbitron', 'Rajdhani', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Headings should use wide tracking, uppercase accents, and restrained glow.

Avoid making all body text futuristic. Body text must remain highly readable.

---

## Page Structure

## 1. Hero Section

### Objective

Immediately establish the world: Jungle Computing is a distributed computing city.

### Visual

Use a full-screen cinematic hero with:

- neon city background,
- glowing towers,
- data beams between buildings,
- subtle parallax movement,
- dark fog/haze,
- orange foundation glow near tower bases,
- blue/cyan upper levels.

### Content

Suggested copy:

```text
WELCOME TO
JUNGLE COMPUTING

A browser-first peer-to-peer framework where every device becomes a node, every node becomes a tower, and every tower joins a living distributed city of computation.
```

### CTAs

- Explore the Network
- View the Architecture
- Launch Simulation
- GitHub

### Interaction

- Mouse movement creates subtle parallax across foreground/midground/background.
- Data beams pulse slowly in the hero.
- CTA hover should create neon border expansion.
- Scroll indicator glows and pulses.

---

## 2. The Old Model Section

### Objective

Show the current normal architecture.

### Visual

A simple centralized architecture diagram:

```text
Users / Browsers -> Web Server -> API Server -> Database
```

The diagram should feel rigid, centralized, and vertically stacked.

### Interaction

When the user scrolls:

- browser icons send requests toward one central server,
- the server becomes increasingly bright/red under load,
- database pulses become congested,
- labels appear: latency, bottleneck, outage risk, cloud cost.

### UX Message

The point is not that centralized architecture is always bad. The point is that it concentrates responsibility and scaling pressure.

Suggested copy:

```text
Most web applications still depend on a central server and database. Browsers request, servers process, databases store. It works, but it concentrates compute, state, cost, and failure risk in the middle.
```

---

## 3. The Shift Section

### Objective

Show the browser changing from a passive client into an active peer.

### Visual

The centralized diagram should transform:

```text
Browser -> Server -> Database
```

into:

```text
Browser <-> Browser <-> Browser
       \      |      /
        Authority / Signalling
```

### Key point

A central authority can still exist, but it is reduced to:

- identity,
- discovery,
- signalling,
- bootstrap,
- coordination.

The actual communication and compute can move closer to the clients.

### Interaction

- Click “centralized” to show current model.
- Click “hybrid” to show authority plus direct peer links.
- Click “mesh” to show many peers communicating.

---

## 4. Tower Anatomy Section

### Objective

Explain the core metaphor.

### Visual

A large interactive tower cutaway.

The tower should show:

- four orange/gold foundation floors,
- multiple blue/cyan upper floors,
- transparent glass/metal structure,
- animated vertical data pulses,
- labels connected by glowing callout lines.

### Foundation floors

The four shared floors should be fixed across every tower:

1. **Security and Trust Layer**
   - identity,
   - encryption,
   - signing,
   - permissions,
   - trust boundaries.

2. **Data and Storage Layer**
   - IndexedDB,
   - OPFS,
   - local-first data,
   - replication,
   - caching,
   - CRDT state.

3. **P2P Communication Layer**
   - WebRTC,
   - WebSocket fallback,
   - signalling,
   - STUN/TURN,
   - message routing.

4. **Compute Abstraction Layer**
   - Web Workers,
   - WASM,
   - WebGPU,
   - AI inference,
   - task scheduling.

### Business floors

Upper floors vary by tower and may include:

- application UI,
- workflow logic,
- AI agents,
- API adapters,
- repair management,
- digital twin visualizations,
- document processing,
- reporting,
- simulation modules.

### Interaction

The user should be able to:

- hover/click each floor,
- see an explanatory panel,
- toggle “foundation view” and “business view”,
- trigger a data pulse from the basement to upper floors,
- send a message from this tower to another tower.

---

## 5. City / Local Mesh Section

### Objective

Show multiple towers becoming a local mesh.

### Visual

A city of towers arranged in clusters.

Each tower represents a browser/device:

- phone = small tower,
- laptop = mid tower,
- desktop = large tower,
- GPU server = tall tower,
- storage node = wider tower,
- authority node = central but not dominant beacon.

### Mesh behavior

Connections between towers should appear as neon beams.

Message types:

| Message | Visual |
|---|---|
| Discovery | faint scanning ring |
| Auth handshake | orange pulse |
| Data sync | blue stream |
| Compute task | purple packet |
| Result return | green pulse |
| Failed route | red flicker |

### Interaction

Users should be able to:

- add a node,
- remove a node,
- simulate a task,
- route a message,
- click a node to inspect capabilities,
- switch between topology modes.

Topology modes:

- star,
- partial mesh,
- full mesh,
- island gateway,
- degraded/offline mode.

---

## 6. Island Computing Section

### Objective

Show how local cities federate.

### Visual

Zoom out to multiple cities on islands or landmasses.

Each city represents a local compute cluster.

Examples:

- home office,
- repair site,
- warehouse,
- branch office,
- regional datacenter,
- mobile field team.

### Island meaning

An island is a governed cluster of nodes and cities.

An island may have:

- shared identity boundary,
- local trust rules,
- local data policy,
- gateway nodes,
- local AI resources,
- intermittent connection to other islands.

### Interaction

- Click an island to zoom in.
- Click a city to reveal its local mesh.
- Toggle federation bridges.
- Simulate an island going offline.
- Show delayed synchronization when connection returns.

---

## 7. Living Network Section

### Objective

Create the emotional payoff.

Show Jungle Computing as a living distributed ecosystem.

### Visual

Country-scale or planet-scale view:

- many glowing cities,
- arcs of blue light,
- small orange foundation glows,
- pulses travelling between regions,
- slow atmospheric camera movement.

### Data overlays

Use simulated live stats:

```text
Connected Towers: 128,742
Active Cities: 843
Island Federations: 27
Messages / sec: 2.4M
Local Compute Shared: 18.7 TFLOPS
Network Uptime: 99.98%
```

Make clear these are demo/simulation stats unless connected to real telemetry.

---

## Interactive Components

## 1. Scroll-Driven Storytelling

Use scroll-driven transitions to progressively reveal the architecture.

Recommended implementation options:

- CSS scroll animations,
- IntersectionObserver,
- GSAP ScrollTrigger if dependencies are acceptable,
- native Web Animations API.

GitHub Pages can support all of these as static JavaScript.

## 2. Three.js Tower Scene

A Three.js section should include:

- orbit controls,
- tower meshes,
- layered floors,
- glowing materials,
- animated packets,
- hover raycasting,
- clickable information panels.

Minimum objects:

- 1 authority node,
- 8 browser client nodes,
- 1 heavy compute node,
- 1 storage node,
- animated message packets.

## 3. Node Inspector Panel

When a user clicks a tower, show:

```text
Node Name
Device Type
Compute Capacity
Storage Capacity
Network Role
Foundation Layers
Business Layers
Current Status
Connected Peers
Recent Messages
```

Example:

```text
Node: Workshop-GPU-01
Type: Heavy compute node
Role: AI inference + task execution
Foundation: Security, Storage, P2P, Compute
Business: Repair estimation, image analysis, reporting
Peers: 14
Status: Online
```

## 4. Task Simulation

A simple static-site simulation should let the user trigger a workload.

Example flow:

1. User clicks “Run Distributed Task”.
2. A purple task packet leaves a small browser tower.
3. The task routes to a stronger compute tower.
4. The compute tower glows.
5. A green result packet returns.
6. The UI explains what happened.

Suggested copy:

```text
The mobile node requested a compute task. The mesh routed it to a stronger peer that shares the same trust boundary. The result returned directly without requiring a central application server to perform the work.
```

## 5. Message Simulation

Allow three message modes:

- broadcast,
- direct peer message,
- routed multi-hop message.

Display the path visually.

## 6. Offline Simulation

Allow a user to toggle a city or node offline.

Show:

- connections fade,
- local state remains available,
- queued messages appear,
- synchronization resumes when online.

This is important because Jungle Computing should communicate resilience and offline-first design.

---

## Animation Guidelines

Animations should feel premium, slow, and intentional.

Avoid excessive motion.

### Recommended motion

- slow camera drift,
- subtle parallax,
- data pulses along lines,
- breathing glow on active nodes,
- floor activation light sweeps,
- hover elevation of cards,
- smooth panel transitions.

### Avoid

- chaotic particle effects,
- too many flashing elements,
- unreadable neon text,
- overusing bloom,
- fast camera spins,
- animations that distract from explanation.

## Accessibility

The website should include:

- reduced motion support,
- sufficient text contrast,
- keyboard navigable controls,
- semantic HTML,
- alt text for images,
- labelled buttons,
- visible focus rings.

Example:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

Do not rely only on color to communicate state.

Use icons, labels, and text as well.

---

## Layout Specification

## Desktop

Recommended max width:

```css
--content-max: 1180px;
```

Sections should use large vertical spacing:

```css
section {
  min-height: 100vh;
  padding: 96px 32px;
}
```

Hero should be full viewport height.

Interactive sections should use split layouts:

```text
Left: explanation / controls
Right: 3D visualization
```

## Tablet

- Reduce hero text size.
- Stack 3D visual below text.
- Keep interaction controls visible.

## Mobile

- Use static or simplified 3D mode.
- Provide “Open Simulation” button rather than forcing heavy WebGL immediately.
- Collapse navigation into menu.
- Replace dense diagrams with card-based steps.

---

## Asset Requirements

## Required images

1. Hero city close-up.
2. Tower anatomy cutaway.
3. Local city mesh.
4. Multi-city island view.
5. Country-scale network view.
6. Old centralized architecture diagram.
7. Browser peer mesh diagram.
8. Island federation diagram.

## Required 3D assets

These can be procedural in Three.js rather than separate model files.

- tower mesh,
- floor slices,
- foundation floors,
- beacon antenna,
- data packet sphere,
- connection line/curve,
- city base/island platform,
- optional cloud/fog planes.

## Icons

Recommended icon concepts:

- peer-to-peer,
- lock/security,
- database/storage,
- lightning/compute,
- globe/federation,
- chip/AI,
- antenna/signalling,
- island/cluster.

Use SVG where possible.

---

## Suggested Component List

For a React implementation:

```text
<AppShell />
<HeroSection />
<CentralizedModelSection />
<MeshTransitionSection />
<TowerAnatomy />
<CityMeshSimulation />
<IslandFederation />
<NodeInspector />
<TaskSimulationControls />
<PrinciplesGrid />
<RoadmapSection />
<DocsCallout />
```

For plain JavaScript:

```text
index.html
styles.css
main.js
three-city.js
simulation.js
content.js
```

---

## Static GitHub Pages Constraints

Because the first version should run on GitHub Pages:

- no backend dependency,
- no server-side rendering,
- no paid hosting,
- no persistent WebSocket requirement,
- no private API keys,
- no build step required unless using a static build output.

The page should work by opening `index.html` from GitHub Pages.

Recommended first version:

- pure HTML/CSS/JS,
- Three.js CDN or local vendor file,
- JSON content file for node descriptions,
- simulated mesh only.

Optional later version:

- WebRTC signalling service,
- real peer connections,
- live telemetry,
- distributed storage demo.

---

## Content Voice

Tone should be:

- visionary,
- clear,
- technical enough for developers,
- simple enough for business readers,
- confident but not overclaiming.

Avoid saying:

- “fully decentralized” unless accurate,
- “serverless” if there is still signalling or authority,
- “blockchain” unless specifically implemented,
- “unlimited scale” without constraints.

Preferred language:

- browser-first,
- peer-to-peer,
- local-first,
- authority-assisted,
- mesh-connected,
- federated,
- simulation mode,
- optional live mode.

---

## Key Copy Blocks for Website

## Hero

```text
Jungle Computing
A browser-first peer-to-peer framework where every device becomes a node, every node becomes a tower, and every tower joins a living distributed city of computation.
```

## Foundation

```text
Every tower shares the same foundation: security, storage, peer communication, and compute abstraction. Above that foundation, each tower can run its own business logic, workflows, AI agents, or applications.
```

## Authority

```text
Jungle Computing does not remove central services completely. It reduces their role. Authority services help peers discover, authenticate, and connect. The work itself can move into the mesh.
```

## Mesh

```text
Once peers discover each other, browsers can communicate directly. Messages, tasks, and synchronized state can move across the mesh instead of always routing through a central application server.
```

## Island Computing

```text
Island Computing extends the model from one local jungle into many federated clusters. A workshop, home, warehouse, office, or region can operate as its own island while still connecting to the wider ecosystem.
```

---

## Definition of Awesome

The page is successful if a visitor can understand these ideas without reading a long architecture paper:

1. Today’s web is often centralized.
2. Jungle Computing makes browsers active peers.
3. Each peer is shown as a tower.
4. All towers share secure foundation layers.
5. Business layers above the foundation can differ.
6. Towers communicate directly through a mesh.
7. Cities represent local clusters.
8. Islands represent federated clusters.
9. The system can be simulated entirely in a static website.
10. The concept has a clear path toward real WebRTC-based implementation.

---

## Developer Checklist

- [ ] Full-screen hero section.
- [ ] Parallax city background.
- [ ] Centralized-to-mesh transition diagram.
- [ ] Interactive tower cutaway.
- [ ] Three.js local city simulation.
- [ ] Clickable node inspector.
- [ ] Animated message packets.
- [ ] Task delegation simulation.
- [ ] Offline/reconnect simulation.
- [ ] Island federation section.
- [ ] Responsive mobile layout.
- [ ] Reduced motion support.
- [ ] GitHub Pages compatible deployment.
- [ ] Documentation links.
- [ ] Clear simulation/live mode distinction.

---

## Implementation Priority

### Phase 1

Build static visual site:

- hero,
- sections,
- content,
- parallax,
- static diagrams.

### Phase 2

Add Three.js tower/city interaction:

- orbit controls,
- node inspector,
- message animation.

### Phase 3

Add educational simulation:

- task routing,
- offline mode,
- topology modes.

### Phase 4

Add optional live mode:

- WebRTC signalling,
- real peer discovery,
- browser-to-browser messages.

### Phase 5

Add deeper framework demonstrations:

- local-first state,
- CRDT synchronization,
- browser compute tasks,
- AI delegation.
