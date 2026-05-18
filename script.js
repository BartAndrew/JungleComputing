// Jungle Computing Interactive City

// Wait until the document is ready
document.addEventListener('DOMContentLoaded', () => {
  // Grab elements
  const canvas = document.getElementById('cityCanvas');
  const infoBox = document.getElementById('infoBox');
  if (!canvas) return;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;

  // Scene
  const scene = new THREE.Scene();
  scene.background = null;
  // Fog for depth perception
  scene.fog = new THREE.Fog(0x0a0f1a, 30, 80);

  // Camera
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
  camera.position.set(12, 12, 28);

  // Orbit controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2.2;

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Ground plane
  const planeGeometry = new THREE.PlaneGeometry(60, 60);
  const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x0a0f1a });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  // Arrays to store towers
  const towers = [];

  // Generate a random set of nodes with some metadata
  const nodeNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu'];

  function addTower(x, z, width, height, id) {
    const baseHeight = 1.5;
    // Base
    const baseGeom = new THREE.BoxGeometry(width, baseHeight, width);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0xffa200, emissive: 0xff9900 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.set(x, baseHeight / 2, z);
    // Upper floors
    const topHeight = height - baseHeight;
    const topGeom = new THREE.BoxGeometry(width * 0.8, topHeight, width * 0.8);
    const topMat = new THREE.MeshPhongMaterial({ color: 0x0090ff, emissive: 0x0055aa });
    const topMesh = new THREE.Mesh(topGeom, topMat);
    topMesh.position.set(x, baseHeight + topHeight / 2, z);
    // Group
    const group = new THREE.Group();
    group.add(baseMesh);
    group.add(topMesh);
    // Assign data
    const cpuCores = 2 + Math.floor(Math.random() * 6);
    const memoryGB = 4 + Math.floor(Math.random() * 32);
    group.userData = {
      id: id,
      name: `Node ${nodeNames[id % nodeNames.length]}`,
      cpu: `${cpuCores} cores`,
      memory: `${memoryGB} GB`,
      info: 'Independent compute node in the jungle computing network.'
    };
    towers.push(group);
    scene.add(group);
  }

  // Arrange towers in a circular layout
  const towerCount = 12;
  const radius = 10;
  for (let i = 0; i < towerCount; i++) {
    const angle = (i / towerCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 5 + Math.random() * 7;
    const width = 1 + Math.random() * 0.6;
    addTower(x, z, width, height, i);
  }

  // Optional: connect towers with faint lines (for aesthetics)
  function addConnection(a, b) {
    const points = [];
    points.push(new THREE.Vector3(a.position.x, 0.1, a.position.z));
    points.push(new THREE.Vector3(b.position.x, 0.1, b.position.z));
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0077cc, opacity: 0.4, transparent: true });
    const line = new THREE.Line(lineGeom, lineMat);
    scene.add(line);
  }
  // Connect each tower to the next (ring)
  for (let i = 0; i < towers.length; i++) {
    const next = towers[(i + 1) % towers.length];
    addConnection(towers[i], next);
  }

  // Raycaster for hover detection
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onPointerMove(event) {
    // Calculate pointer position in normalized device coordinates (-1 to +1) for both components
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // Intersect objects
    const intersects = raycaster.intersectObjects(towers, true);
    if (intersects.length > 0) {
      // We may intersect individual mesh; get parent group
      let target = intersects[0].object;
      while (target.parent && !target.userData.id) {
        target = target.parent;
      }
      const data = target.userData;
      // Display info
      infoBox.style.display = 'block';
      infoBox.innerHTML = `<strong>${data.name}</strong><br>CPU: ${data.cpu}<br>Memory: ${data.memory}<br>${data.info}`;
      infoBox.style.left = `${event.clientX + 12}px`;
      infoBox.style.top = `${event.clientY + 12}px`;
    } else {
      infoBox.style.display = 'none';
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('touchmove', (e) => {
    // For touch devices, use the first touch point
    if (e.touches.length > 0) {
      onPointerMove(e.touches[0]);
    }
  });
  // Hide info box on leave
  canvas.addEventListener('mouseleave', () => {
    infoBox.style.display = 'none';
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    // Update controls
    controls.update();
    // Resize handling
    if (canvas.clientWidth !== renderer.domElement.width || canvas.clientHeight !== renderer.domElement.height) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }
  animate();
});