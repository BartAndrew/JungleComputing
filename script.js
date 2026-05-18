document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  setupArchitectureModes();
  setupTowerScene(reducedMotion);
  setupMeshScene(reducedMotion);
  setupHeroScene(reducedMotion);
  setupReactivePanels(reducedMotion);
});

function setupReactivePanels(reducedMotion) {
  const panels = Array.from(document.querySelectorAll(".reactive-panel"));
  if (!panels.length || reducedMotion) {
    return;
  }

  panels.forEach((panel) => {
    panel.addEventListener("pointermove", (event) => {
      const rect = panel.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      panel.style.setProperty("--mx", `${Math.round(x * 100)}%`);
      panel.style.setProperty("--my", `${Math.round(y * 100)}%`);
      panel.style.setProperty("--ry", `${(x - 0.5) * 5}deg`);
      panel.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
    });

    panel.addEventListener("pointerleave", () => {
      panel.style.setProperty("--ry", "0deg");
      panel.style.setProperty("--rx", "0deg");
      panel.style.setProperty("--mx", "50%");
      panel.style.setProperty("--my", "50%");
    });
  });
}

function setupArchitectureModes() {
  const diagram = document.getElementById("architecture-diagram");
  const copy = document.getElementById("mode-copy");
  const buttons = Array.from(document.querySelectorAll(".mode-button"));

  if (!diagram || !copy || !buttons.length) {
    return;
  }

  const modeContent = {
    centralized: {
      title: "Centralized model",
      body: "Browsers send requests upward, servers process nearly everything, and the database becomes the permanent center of truth and pressure.",
      points: [
        "Compute and storage concentrate in one place.",
        "Latency and outage risk increase with distance and scale.",
        "Offline operation is weak unless explicitly engineered.",
      ],
    },
    hybrid: {
      title: "Hybrid model",
      body: "A smaller authority layer helps with discovery, trust, and signalling while peers begin to connect and exchange work more directly.",
      points: [
        "Authority services stay important, but their role becomes specialized.",
        "Direct peer links reduce unnecessary server round-trips.",
        "The browser starts participating in synchronization and task handling.",
      ],
    },
    mesh: {
      title: "Mesh model",
      body: "Once peers discover one another, messages, state, and workloads can move across the mesh rather than always returning to a central application server.",
      points: [
        "Nodes can collaborate based on local capacity and trust boundaries.",
        "Local-first behavior becomes practical and visible.",
        "The network expands from towers to cities to island federations.",
      ],
    },
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      const content = modeContent[mode];
      if (!content) {
        return;
      }

      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });

      diagram.dataset.mode = mode;
      copy.innerHTML = `
        <h3>${content.title}</h3>
        <p>${content.body}</p>
        <ul class="detail-list">
          ${content.points.map((point) => `<li>${point}</li>`).join("")}
        </ul>
      `;
    });
  });
}

function createCanvasScene(canvas, options = {}) {
  if (!canvas || !window.THREE) {
    return null;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    options.fov || 42,
    1,
    options.near || 0.1,
    options.far || 500
  );

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener("resize", resize);

  return { renderer, scene, camera, resize };
}

function setupHeroScene(reducedMotion) {
  const canvas = document.getElementById("hero-canvas");
  const base = createCanvasScene(canvas, { fov: 40, far: 300 });
  if (!base) {
    return;
  }

  const { renderer, scene, camera } = base;
  camera.position.set(0, 18, 36);

  scene.fog = new THREE.Fog(0x04101c, 22, 82);
  scene.add(new THREE.AmbientLight(0x8ecbff, 1.6));

  const keyLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
  keyLight.position.set(16, 24, 10);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xf59e0b, 1.6, 80, 2);
  rimLight.position.set(-8, 6, 10);
  scene.add(rimLight);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 36, 2.4, 64),
    new THREE.MeshStandardMaterial({
      color: 0x08111f,
      emissive: 0x04101c,
      metalness: 0.4,
      roughness: 0.7,
    })
  );
  ground.position.y = -1.8;
  scene.add(ground);

  const buildings = [];
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
  });

  const rings = [7.5, 12.5, 17.5];
  let index = 0;

  rings.forEach((radius, ringIndex) => {
    const count = 6 + ringIndex * 4;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + ringIndex * 0.2;
      const height = 4 + Math.random() * 10 + ringIndex * 2.8;
      const tower = createTowerMesh({
        width: 1.2 + Math.random() * 0.5,
        baseFloors: 4,
        businessFloors: 3 + Math.floor(Math.random() * 5),
        businessHeight: height,
      });
      tower.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      tower.rotation.y = Math.random() * Math.PI;
      tower.userData.heroPulse = Math.random() * Math.PI * 2;
      buildings.push(tower);
      scene.add(tower);
      index += 1;
    }
  });

  for (let i = 0; i < buildings.length; i += 1) {
    const current = buildings[i];
    const next = buildings[(i + 1) % buildings.length];
    const points = [
      new THREE.Vector3(current.position.x, 0.4, current.position.z),
      new THREE.Vector3(next.position.x, 0.4, next.position.z),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    scene.add(new THREE.Line(geometry, lineMaterial));
  }

  const packets = [];
  for (let i = 0; i < 10; i += 1) {
    const startIndex = Math.floor(Math.random() * buildings.length);
    let endIndex = Math.floor(Math.random() * buildings.length);
    if (endIndex === startIndex) {
      endIndex = (endIndex + 6) % buildings.length;
    }

    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x22c55e : 0xa855f7 })
    );
    packet.userData = {
      progress: Math.random(),
      speed: 0.0016 + Math.random() * 0.0014,
      start: buildings[startIndex].position.clone().setY(0.65),
      end: buildings[endIndex].position.clone().setY(0.65),
    };
    packets.push(packet);
    scene.add(packet);
  }

  function animate() {
    requestAnimationFrame(animate);

    const t = performance.now();
    if (!reducedMotion) {
      scene.rotation.y += 0.0012;
      camera.position.x = Math.sin(t * 0.00015) * 1.6;
      camera.position.z = 36 + Math.cos(t * 0.00012) * 1.2;
      camera.lookAt(0, 7, 0);
    }

    buildings.forEach((tower, buildingIndex) => {
      const glow = 0.15 + Math.sin(t * 0.0012 + tower.userData.heroPulse + buildingIndex * 0.2) * 0.06;
      tower.children.forEach((mesh) => {
        if (mesh.material && "emissiveIntensity" in mesh.material) {
          mesh.material.emissiveIntensity = mesh.userData.foundation ? 0.48 : 0.22 + glow;
        }
      });
    });

    packets.forEach((packet) => {
      packet.userData.progress += packet.userData.speed;
      if (packet.userData.progress > 1) {
        packet.userData.progress = 0;
      }
      packet.position.lerpVectors(
        packet.userData.start,
        packet.userData.end,
        packet.userData.progress
      );
    });

    renderer.render(scene, camera);
  }

  animate();
}

function createTowerMesh(config) {
  const width = config.width || 2;
  const baseFloors = config.baseFloors || 4;
  const businessFloors = config.businessFloors || 5;
  const businessHeight = config.businessHeight || 9;
  const group = new THREE.Group();
  const floorMeshes = [];

  for (let i = 0; i < baseFloors; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.9, width),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xf59e0b : 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.45,
        metalness: 0.55,
        roughness: 0.32,
      })
    );
    mesh.position.y = 0.45 + i * 0.94;
    mesh.userData = {
      layerType: ["security", "storage", "communication", "compute"][i] || "foundation",
      foundation: true,
    };
    group.add(mesh);
    floorMeshes.push(mesh);
  }

  for (let i = 0; i < businessFloors; i += 1) {
    const businessFloorHeight = businessHeight / businessFloors;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, businessFloorHeight, width * 0.82),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x0ea5e9 : 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.26,
        metalness: 0.35,
        roughness: 0.22,
        transparent: true,
        opacity: 0.96,
      })
    );
    mesh.position.y = baseFloors * 0.94 + businessFloorHeight * 0.5 + businessFloorHeight * i;
    mesh.userData = {
      layerType: "business",
      foundation: false,
    };
    group.add(mesh);
    floorMeshes.push(mesh);
  }

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.4, 10),
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.12,
      metalness: 0.75,
      roughness: 0.28,
    })
  );
  antenna.position.y = baseFloors * 0.94 + businessHeight + 0.8;
  group.add(antenna);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  beacon.position.y = antenna.position.y + 0.9;
  group.add(beacon);

  group.userData.floorMeshes = floorMeshes;
  group.userData.beacon = beacon;
  return group;
}

function setupTowerScene(reducedMotion) {
  const canvas = document.getElementById("tower-canvas");
  const inspector = document.getElementById("tower-inspector");
  const buttons = Array.from(document.querySelectorAll(".floor-button"));
  const layerRows = Array.from(document.querySelectorAll(".layer-row"));
  const base = createCanvasScene(canvas, { fov: 34, far: 120 });

  if (!base) {
    return;
  }

  const { renderer, scene, camera } = base;
  camera.position.set(8, 10, 18);
  scene.fog = new THREE.Fog(0x050d18, 16, 48);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 10;
  controls.maxDistance = 26;
  controls.maxPolarAngle = Math.PI / 2.08;

  scene.add(new THREE.AmbientLight(0xffffff, 1.4));

  const topLight = new THREE.DirectionalLight(0x9ddcff, 1.2);
  topLight.position.set(6, 12, 8);
  scene.add(topLight);

  const foundationLight = new THREE.PointLight(0xf59e0b, 1.2, 40, 2);
  foundationLight.position.set(-4, 2, 4);
  scene.add(foundationLight);

  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(7.6, 8.8, 1.1, 48),
    new THREE.MeshStandardMaterial({
      color: 0x08101d,
      emissive: 0x030813,
      metalness: 0.5,
      roughness: 0.68,
    })
  );
  stage.position.y = -0.65;
  scene.add(stage);

  const tower = createTowerMesh({
    width: 3.8,
    baseFloors: 4,
    businessFloors: 5,
    businessHeight: 9,
  });
  scene.add(tower);

  const pulseSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  pulseSphere.visible = false;
  scene.add(pulseSphere);

  const layerDetails = {
    security: {
      title: "Security and trust layer",
      text: "Identity, encryption, signatures, and permissions live at the base so every node can trust who it is talking to before it starts routing work.",
    },
    storage: {
      title: "Data and storage layer",
      text: "Local-first persistence keeps data useful on the device first. Replication and synchronization happen outward rather than assuming the cloud is always available.",
    },
    communication: {
      title: "Peer communication layer",
      text: "WebRTC, signalling, STUN/TURN, and message routing form the transport layer that lets browsers speak directly once trust has been established.",
    },
    compute: {
      title: "Compute abstraction layer",
      text: "Workers, WASM, GPU access, scheduling, and inference capabilities provide a common execution plane for browser-side workloads.",
    },
    business: {
      title: "Business and application layers",
      text: "This is where towers diverge. One node might run AI inference and reporting, another may expose workflow logic, dashboards, simulations, or collaboration tools.",
    },
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let highlightedLayer = "security";
  let pulseActive = false;
  let pulseProgress = 0;

  function setInspector(layer) {
    const detail = layerDetails[layer] || layerDetails.security;
    highlightedLayer = layer;
    if (inspector) {
      inspector.innerHTML = `<h3>${detail.title}</h3><p>${detail.text}</p>`;
    }
    layerRows.forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.layer === layer);
    });
  }

  function applyFocus(focus) {
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.focus === focus);
    });

    tower.userData.floorMeshes.forEach((mesh) => {
      const isFoundation = mesh.userData.foundation;
      if (focus === "foundation") {
        mesh.visible = isFoundation;
      } else if (focus === "business") {
        mesh.visible = !isFoundation;
      } else {
        mesh.visible = true;
      }
      if (mesh.material) {
        mesh.material.opacity = mesh.visible ? 0.96 : 0.08;
      }
    });

    if (focus === "pulse") {
      pulseActive = true;
      pulseProgress = 0;
    }
  }

  function runPulse() {
    pulseActive = true;
    pulseProgress = 0;
    applyFocus("all");
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const focus = button.dataset.focus;
      if (focus === "pulse") {
        runPulse();
      } else {
        applyFocus(focus);
      }
    });
  });

  layerRows.forEach((row) => {
    row.addEventListener("click", () => setInspector(row.dataset.layer));
  });

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick(event) {
    onPointerMove(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(tower.userData.floorMeshes, false);
    if (intersects.length) {
      setInspector(intersects[0].object.userData.layerType);
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", onClick);

  setInspector("security");
  applyFocus("all");

  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    const t = performance.now() * 0.001;
    tower.userData.floorMeshes.forEach((mesh, index) => {
      if (mesh.material && mesh.visible) {
        const active =
          mesh.userData.layerType === highlightedLayer ||
          (highlightedLayer === "business" && mesh.userData.layerType === "business");
        const pulse = 0.08 + Math.sin(t * 1.8 + index * 0.32) * 0.04;
        mesh.material.emissiveIntensity = active
          ? mesh.userData.foundation
            ? 0.92
            : 0.62
          : mesh.userData.foundation
            ? 0.42 + pulse
            : 0.24 + pulse;
      }
    });

    if (pulseActive) {
      pulseSphere.visible = true;
      pulseProgress += 0.012;
      const maxHeight = tower.userData.beacon.position.y;
      pulseSphere.position.set(0, 0.4 + maxHeight * pulseProgress, 0);
      if (pulseProgress >= 1) {
        pulseActive = false;
        pulseSphere.visible = false;
      }
    }

    tower.userData.beacon.material.color.setHex(
      0x38bdf8 + Math.floor((Math.sin(t * 2.2) + 1) * 6)
    );

    renderer.render(scene, camera);
  }

  animate();
}

function setupMeshScene(reducedMotion) {
  const canvas = document.getElementById("mesh-canvas");
  const base = createCanvasScene(canvas, { fov: 46, far: 280 });
  if (!base) {
    return;
  }

  const { renderer, scene, camera } = base;
  const nodeInspector = document.getElementById("node-inspector");
  const eventLog = document.getElementById("event-log");
  const statNodes = document.getElementById("stat-nodes");
  const statLinks = document.getElementById("stat-links");
  const statMode = document.getElementById("stat-mode");
  const statStatus = document.getElementById("stat-status");

  camera.position.set(18, 26, 28);
  scene.fog = new THREE.FogExp2(0x06101d, 0.025);
  scene.add(new THREE.AmbientLight(0xbedfff, 1.35));

  const sun = new THREE.DirectionalLight(0x9ddcff, 1.1);
  sun.position.set(24, 30, 12);
  scene.add(sun);

  const grid = new THREE.GridHelper(64, 16, 0x173049, 0x0a1528);
  grid.position.y = -0.3;
  scene.add(grid);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.maxPolarAngle = Math.PI / 2.06;
  controls.minDistance = 18;
  controls.maxDistance = 54;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const state = {
    topology: "mesh",
    offlineMode: false,
    nodes: [],
    links: [],
    packets: [],
    linesGroup: new THREE.Group(),
    activeNode: null,
  };

  scene.add(state.linesGroup);

  const nodeData = [
    { name: "Authority-01", type: "Authority node", role: "Identity + signalling", capacity: "Gateway", color: 0xf59e0b, size: 1.8, pos: new THREE.Vector3(0, 1.2, 0) },
    { name: "Workshop-GPU-01", type: "Heavy compute node", role: "AI inference + task execution", capacity: "High", color: 0x38bdf8, size: 1.5, pos: new THREE.Vector3(-12, 1.2, -8) },
    { name: "Workshop-Desktop-02", type: "Desktop node", role: "Visualization + routing", capacity: "Medium", color: 0x0ea5e9, size: 1.25, pos: new THREE.Vector3(-6, 1.2, 10) },
    { name: "Phone-03", type: "Thin node", role: "Capture + lightweight sync", capacity: "Low", color: 0x22c55e, size: 0.8, pos: new THREE.Vector3(8, 1.2, -12) },
    { name: "Tablet-04", type: "Thin node", role: "UI + cached state", capacity: "Low", color: 0x22c55e, size: 0.9, pos: new THREE.Vector3(14, 1.2, 4) },
    { name: "Storage-05", type: "Storage node", role: "Replication + local archive", capacity: "Wide", color: 0xfbbf24, size: 1.35, pos: new THREE.Vector3(-16, 1.2, 6) },
    { name: "Office-Laptop-06", type: "Laptop node", role: "Workflow + mesh participant", capacity: "Medium", color: 0x38bdf8, size: 1.05, pos: new THREE.Vector3(2, 1.2, 14) },
    { name: "Field-Node-07", type: "Mobile field node", role: "Intermittent sync", capacity: "Low", color: 0x22c55e, size: 0.85, pos: new THREE.Vector3(18, 1.2, -4) },
  ];

  function makeNode(data) {
    const tower = createTowerMesh({
      width: data.size,
      baseFloors: 4,
      businessFloors: data.type === "Thin node" || data.type === "Mobile field node" ? 2 : 4,
      businessHeight: data.type === "Heavy compute node" ? 8.6 : 5.4,
    });
    tower.position.copy(data.pos);
    tower.userData = {
      ...tower.userData,
      ...data,
      online: true,
      selected: false,
      neighbors: [],
    };

    tower.children.forEach((mesh) => {
      if (mesh.material && mesh.userData && !mesh.userData.foundation) {
        mesh.material.color = new THREE.Color(data.color);
        mesh.material.emissive = new THREE.Color(data.color);
      }
    });

    scene.add(tower);
    state.nodes.push(tower);
  }

  nodeData.forEach(makeNode);

  function linkNodes(a, b, kind = "peer") {
    const curve = new THREE.CatmullRomCurve3([
      a.position.clone().setY(1.4),
      new THREE.Vector3(
        (a.position.x + b.position.x) * 0.5,
        kind === "authority" ? 4.8 : 2.8,
        (a.position.z + b.position.z) * 0.5
      ),
      b.position.clone().setY(1.4),
    ]);
    const geometry = new THREE.TubeGeometry(curve, 24, 0.06, 10, false);
    const material = new THREE.MeshBasicMaterial({
      color: kind === "authority" ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: kind === "authority" ? 0.72 : 0.38,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { a, b, kind };
    state.linesGroup.add(mesh);
    state.links.push(mesh);
    a.userData.neighbors.push(b.userData.name);
    b.userData.neighbors.push(a.userData.name);
  }

  function rebuildLinks() {
    state.links.forEach((link) => state.linesGroup.remove(link));
    state.links = [];
    state.nodes.forEach((node) => {
      node.userData.neighbors = [];
    });

    const authority = state.nodes[0];
    const visibleNodes = state.nodes.filter((node) => node.userData.online);

    if (state.topology === "star") {
      visibleNodes.slice(1).forEach((node) => linkNodes(authority, node, "authority"));
    } else if (state.topology === "ring") {
      const ringNodes = visibleNodes.slice(1);
      ringNodes.forEach((node, index) => {
        const next = ringNodes[(index + 1) % ringNodes.length];
        if (next) {
          linkNodes(node, next, "peer");
        }
      });
      visibleNodes.slice(1, 4).forEach((node) => linkNodes(authority, node, "authority"));
    } else {
      visibleNodes.forEach((node, index) => {
        if (index > 0) {
          linkNodes(authority, node, "authority");
        }
      });

      for (let i = 1; i < visibleNodes.length; i += 1) {
        for (let j = i + 1; j < visibleNodes.length; j += 1) {
          const a = visibleNodes[i];
          const b = visibleNodes[j];
          if (a.position.distanceTo(b.position) < 17) {
            linkNodes(a, b, "peer");
          }
        }
      }
    }

    statNodes.textContent = String(state.nodes.length);
    statLinks.textContent = String(state.links.length);
    statMode.textContent =
      state.topology === "mesh"
        ? "Mesh"
        : state.topology === "star"
          ? "Authority star"
          : "Ring";
  }

  function pushEvent(title, text) {
    if (!eventLog) {
      return;
    }
    const item = document.createElement("div");
    item.className = "event-item";
    item.innerHTML = `<strong>${title}</strong><br>${text}`;
    eventLog.prepend(item);
    while (eventLog.children.length > 5) {
      eventLog.removeChild(eventLog.lastElementChild);
    }
  }

  function inspectNode(node) {
    state.activeNode = node;
    if (!nodeInspector) {
      return;
    }

    nodeInspector.innerHTML = `
      <h3>${node.userData.name}</h3>
      <p>${node.userData.type}</p>
      <p>Role: ${node.userData.role}</p>
      <p>Capacity: ${node.userData.capacity}</p>
      <p>Status: ${node.userData.online ? "Online" : "Offline / queued"}</p>
      <p>Peers: ${node.userData.neighbors.join(", ") || "None"}</p>
    `;
  }

  function setOfflineZone() {
    state.offlineMode = !state.offlineMode;
    const targets = state.nodes.slice(3, 5);
    targets.forEach((node) => {
      node.userData.online = !state.offlineMode;
      node.traverse((child) => {
        if (child.material && "opacity" in child.material) {
          child.material.transparent = true;
          child.material.opacity = state.offlineMode ? 0.26 : 0.96;
        }
      });
    });
    rebuildLinks();
    statStatus.textContent = state.offlineMode ? "Partitioned" : "Healthy";
    pushEvent(
      state.offlineMode ? "Offline partition" : "Reconnected",
      state.offlineMode
        ? "A thin-node zone dropped offline. Local state remains available and queued for later synchronization."
        : "The offline zone has rejoined the city and can now replay queued synchronization."
    );
  }

  function spawnPacket(path, color, speed, label) {
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 14),
      new THREE.MeshBasicMaterial({ color })
    );
    packet.userData = {
      path,
      progress: 0,
      speed,
      label,
    };
    state.packets.push(packet);
    scene.add(packet);
  }

  function runTaskSimulation() {
    const start = state.nodes.find((node) => node.userData.name === "Phone-03");
    const relay = state.nodes[0];
    const target = state.nodes.find((node) => node.userData.name === "Workshop-GPU-01");
    const returnNode = start;

    if (!start || !relay || !target || !start.userData.online || !target.userData.online) {
      pushEvent("Task blocked", "The chosen route is unavailable while a node is offline.");
      return;
    }

    spawnPacket(
      [start.position.clone().setY(2), relay.position.clone().setY(3), target.position.clone().setY(4)],
      0xa855f7,
      0.008,
      "Compute task"
    );
    spawnPacket(
      [target.position.clone().setY(4), relay.position.clone().setY(3), returnNode.position.clone().setY(2)],
      0x22c55e,
      0.0068,
      "Result"
    );
    pushEvent(
      "Distributed task",
      "A mobile node requested work. The mesh routed it to a stronger compute tower and returned the result directly."
    );
  }

  function broadcastSync() {
    const source = state.nodes[1];
    state.nodes.forEach((node, index) => {
      if (node !== source && node.userData.online) {
        spawnPacket(
          [source.position.clone().setY(2.8), node.position.clone().setY(2.8)],
          index % 2 === 0 ? 0x38bdf8 : 0xfbbf24,
          0.0052,
          "Sync"
        );
      }
    });
    pushEvent(
      "Broadcast sync",
      "The city is propagating a synchronized state update across the local mesh."
    );
  }

  document.querySelectorAll("[data-topology]").forEach((button) => {
    button.addEventListener("click", () => {
      state.topology = button.dataset.topology;
      document.querySelectorAll("[data-topology]").forEach((other) => {
        other.classList.toggle("is-active", other === button);
      });
      rebuildLinks();
      pushEvent(
        "Topology changed",
        state.topology === "mesh"
          ? "Nodes now prefer direct peer routes where local distance permits."
          : state.topology === "star"
            ? "Traffic now favors the authority node as the central coordination point."
            : "The city is demonstrating a constrained ring topology."
      );
    });
  });

  document.getElementById("run-task")?.addEventListener("click", runTaskSimulation);
  document.getElementById("broadcast-message")?.addEventListener("click", broadcastSync);
  document.getElementById("toggle-offline")?.addEventListener("click", setOfflineZone);

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  canvas.addEventListener("pointermove", updatePointer);
  canvas.addEventListener("click", (event) => {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const meshes = state.nodes.flatMap((node) => node.userData.floorMeshes || []);
    const intersections = raycaster.intersectObjects(meshes, false);
    if (intersections.length) {
      const mesh = intersections[0].object;
      const node = state.nodes.find((item) => item.userData.floorMeshes.includes(mesh));
      if (node) {
        inspectNode(node);
      }
    }
  });

  rebuildLinks();
  inspectNode(state.nodes[1]);
  pushEvent("Simulation ready", "The city mesh is ready. Inspect nodes or trigger traffic patterns.");

  function animatePacket(packet, delta) {
    packet.userData.progress += packet.userData.speed * delta;
    if (packet.userData.progress >= 1) {
      scene.remove(packet);
      return false;
    }

    const path = packet.userData.path;
    const segmentCount = path.length - 1;
    const scaled = packet.userData.progress * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
    const localProgress = scaled - segmentIndex;
    packet.position.lerpVectors(path[segmentIndex], path[segmentIndex + 1], localProgress);
    return true;
  }

  let lastFrame = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min((now - lastFrame) / 16.6667, 2.4);
    lastFrame = now;

    controls.update();

    state.nodes.forEach((node, index) => {
      const t = now * 0.0012 + index * 0.45;
      node.userData.beacon.position.y = 7.4 + Math.sin(t) * 0.18;
      node.children.forEach((child) => {
        if (child.material && child.userData && !child.userData.foundation) {
          child.material.emissiveIntensity = node.userData.online
            ? 0.2 + Math.sin(t) * 0.04
            : 0.02;
        }
      });
      if (state.activeNode === node) {
        node.rotation.y += reducedMotion ? 0 : 0.01;
      }
    });

    state.packets = state.packets.filter((packet) => animatePacket(packet, delta));

    renderer.render(scene, camera);
  }

  animate();
}
