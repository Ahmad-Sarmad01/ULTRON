import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export const CORE_ZOOM_MIN = 0.45;
export const CORE_ZOOM_MAX = 28;

const PALETTES = {
  idle: { dim: 0x4a2a08, faint: 0x553300, mid: 0x884400, bright: 0xaa5f12, gold: 0xd3942a, hot: 0xf2c35c, white: 0xfff1c2, alert: false },
  listening: { dim: 0x5b3009, faint: 0x6f390b, mid: 0x9b500d, bright: 0xc47517, gold: 0xe0a63a, hot: 0xffd77a, white: 0xfff5d2, alert: false },
  thinking: { dim: 0x603008, faint: 0x743a0b, mid: 0xa9570e, bright: 0xd67b18, gold: 0xe7ad43, hot: 0xffd982, white: 0xfff5d8, alert: false },
  scanning: { dim: 0x59320b, faint: 0x70410d, mid: 0x9b5d13, bright: 0xc77b20, gold: 0xe4ac4a, hot: 0xffd781, white: 0xfff6d9, alert: false },
  recalling: { dim: 0x4f2a09, faint: 0x60340b, mid: 0x93510f, bright: 0xb87119, gold: 0xdca147, hot: 0xffcd79, white: 0xfff1ca, alert: false },
  vision: { dim: 0x5b3009, faint: 0x6e3b0b, mid: 0x98510f, bright: 0xc8731a, gold: 0xe2a13d, hot: 0xffd476, white: 0xfff2cf, alert: false },
  alert: { dim: 0x4d1509, faint: 0x6b1e0d, mid: 0x982914, bright: 0xc64a20, gold: 0xe4773e, hot: 0xffb17b, white: 0xffe0c7, alert: true },
};

const DATA_WORDS = ["sys.init()", "0xFF3A", "malloc()", ">> SCAN", "void*", "ACK", "SYNC OK", "ptr_ref", "exec()", "hash256", "core.0", "01101001", "10110100", ">>> RDY", "HEAP 4K", "TCP/SYN", "AES-256", "RSA 4096", "TLS 1.3", "HTTP/2"];

function paletteFor(mode) {
  return PALETTES[mode] || PALETTES.idle;
}

function lineMaterial(color, opacity, linewidth = 1) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, linewidth });
}

function createArc(radius, start, end, segments, material) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = start + ((end - start) * index) / segments;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

function createLatitude(radius, y, material, segments = 96) {
  const ringRadius = Math.sqrt(Math.max(0.02, radius * radius - y * y));
  return createArc(ringRadius, 0, Math.PI * 2, segments, material);
}

function createMeridian(radius, rotation, material, segments = 96) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * index) / segments;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.rotation.y = rotation;
  return line;
}

function createCodeTexture(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.font = "24px monospace";
  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.fillText(text, 8, 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function disposeObject(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

export function createCoreScene(mount, initialMode = "idle", initialActivity = "idle") {
  const width = Math.max(320, mount.clientWidth || window.innerWidth);
  const height = Math.max(320, mount.clientHeight || window.innerHeight);
  let palette = paletteFor(initialMode);
  let activity = initialActivity;
  let zoom = 7.8;
  let rotationY = 0;
  let rotationX = 0;
  let disposed = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x010101, 0.007);
  const camera = new THREE.PerspectiveCamera(43, width / height, 0.025, 140);
  camera.position.set(0, 0.15, zoom);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.38, 0.3);
  bloom.resolution.set(Math.min(width, 960), Math.min(height, 720));
  composer.addPass(bloom);

  const ambient = new THREE.AmbientLight(0x6b3a12, 0.7);
  scene.add(ambient);
  const keyLight = new THREE.PointLight(palette.hot, 3.6, 18, 1.6);
  keyLight.position.set(2.4, 1.8, 4.5);
  scene.add(keyLight);

  const root = new THREE.Group();
  scene.add(root);
  const coreGroup = new THREE.Group();
  root.add(coreGroup);
  const shellGroup = new THREE.Group();
  root.add(shellGroup);
  const orbitGroup = new THREE.Group();
  root.add(orbitGroup);
  const dataGroup = new THREE.Group();
  root.add(dataGroup);

  const shellLines = [];
  for (let index = 0; index < 31; index += 1) {
    const y = -1.85 + (3.7 * index) / 30;
    const material = lineMaterial(index % 5 === 0 ? palette.bright : palette.mid, index % 5 === 0 ? 0.42 : 0.17);
    const line = createLatitude(1.88, y, material);
    line.rotation.x = Math.PI / 2;
    shellGroup.add(line);
    shellLines.push(line);
  }
  for (let index = 0; index < 24; index += 1) {
    const line = createMeridian(1.88, (Math.PI * 2 * index) / 24, lineMaterial(index % 6 === 0 ? palette.bright : palette.dim, index % 6 === 0 ? 0.36 : 0.15));
    line.rotation.z = Math.PI / 2;
    shellGroup.add(line);
    shellLines.push(line);
  }
  const equator = createLatitude(1.9, 0, lineMaterial(palette.gold, 0.64), 128);
  equator.rotation.x = Math.PI / 2;
  shellGroup.add(equator);
  shellLines.push(equator);

  const partialArcs = [];
  for (let index = 0; index < 16; index += 1) {
    const arc = createArc(2.05 + (index % 4) * 0.08, -0.35 + (index % 3) * 0.2, Math.PI * (0.62 + (index % 4) * 0.08), 48, lineMaterial(index % 3 === 0 ? palette.bright : palette.mid, 0.16 + (index % 4) * 0.035));
    arc.rotation.set(index * 0.31, index * 0.47, index * 0.19);
    shellGroup.add(arc);
    partialArcs.push(arc);
  }
  for (let index = 0; index < 12; index += 1) {
    const arc = createArc(2.12 + (index % 3) * 0.1, -1.0, 1.1 + (index % 4) * 0.28, 48, lineMaterial(palette.bright, 0.14 + (index % 3) * 0.04));
    arc.rotation.set(Math.PI / 2, index * 0.52, index * 0.27);
    shellGroup.add(arc);
    partialArcs.push(arc);
  }

  const innerGroup = new THREE.Group();
  coreGroup.add(innerGroup);
  const innerPoints = [];
  for (let spiral = 0; spiral < 8; spiral += 1) {
    for (let index = 0; index < 180; index += 1) {
      const t = index / 179;
      const angle = t * Math.PI * 7 + spiral * (Math.PI * 2) / 8;
      const radius = 0.58 + t * 0.95;
      innerPoints.push(Math.cos(angle) * radius, (t - 0.5) * 1.35 + Math.sin(angle * 1.7) * 0.08, Math.sin(angle) * radius);
    }
  }
  const innerGeometry = new THREE.BufferGeometry();
  innerGeometry.setAttribute("position", new THREE.Float32BufferAttribute(innerPoints, 3));
  const innerParticles = new THREE.Points(innerGeometry, new THREE.PointsMaterial({ color: palette.gold, size: 0.022, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false }));
  innerGroup.add(innerParticles);
  for (let index = 0; index < 7; index += 1) {
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 80 }, (_, point) => {
      const angle = (point / 79) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * (0.7 + index * 0.14), Math.sin(angle) * (0.7 + index * 0.14), 0);
    })), lineMaterial(palette.bright, 0.2));
    ring.rotation.set(index * 0.38, index * 0.24, index * 0.17);
    innerGroup.add(ring);
  }

  const nucleus = new THREE.Group();
  coreGroup.add(nucleus);
  const nucleusGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), new THREE.MeshBasicMaterial({ color: palette.mid, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false }));
  const nucleusShell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), new THREE.MeshBasicMaterial({ color: palette.gold, wireframe: true, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending }));
  const nucleusCore = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 20), new THREE.MeshBasicMaterial({ color: palette.hot, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending }));
  const nucleusHot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: palette.white, blending: THREE.AdditiveBlending }));
  nucleus.add(nucleusGlow, nucleusShell, nucleusCore, nucleusHot);

  const panelGroup = new THREE.Group();
  shellGroup.add(panelGroup);
  const panelGeometry = new THREE.PlaneGeometry(0.12, 0.12);
  for (let index = 0; index < 30; index += 1) {
    const panel = new THREE.Mesh(panelGeometry, new THREE.MeshBasicMaterial({ color: palette.bright, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const phi = Math.acos(1 - (2 * (index + 0.5)) / 30);
    const theta = Math.PI * (3 - Math.sqrt(5)) * index;
    const normal = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    panel.position.copy(normal).multiplyScalar(1.9);
    panel.lookAt(normal.clone().multiplyScalar(3));
    panel.userData.phase = index * 0.73;
    panelGroup.add(panel);
  }

  const debris = [];
  const debrisGeometries = [new THREE.IcosahedronGeometry(0.035, 0), new THREE.TetrahedronGeometry(0.05, 0), new THREE.OctahedronGeometry(0.045, 0)];
  for (let index = 0; index < 110; index += 1) {
    const mesh = new THREE.Mesh(debrisGeometries[index % 3], new THREE.MeshBasicMaterial({ color: index % 4 === 0 ? palette.gold : palette.mid, transparent: true, opacity: 0.35 + (index % 5) * 0.08, blending: THREE.AdditiveBlending }));
    mesh.userData = { radius: 2.45 + (index % 16) * 0.17, angle: index * 2.399, speed: 0.035 + (index % 7) * 0.008, tilt: -0.75 + (index % 11) * 0.14, phase: index * 0.61 };
    orbitGroup.add(mesh);
    debris.push(mesh);
  }

  const orbitLines = [];
  for (let index = 0; index < 18; index += 1) {
    const radius = 2.35 + (index % 9) * 0.31;
    const points = Array.from({ length: 128 }, (_, point) => {
      const angle = (point / 127) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * (0.42 + (index % 4) * 0.12), 0);
    });
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(index % 4 === 0 ? palette.gold : palette.dim, 0.14 + (index % 4) * 0.035));
    orbit.rotation.set(index * 0.21, index * 0.37, index * 0.14);
    orbit.userData.speed = (index % 2 ? -1 : 1) * (0.0008 + index * 0.00008);
    orbitGroup.add(orbit);
    orbitLines.push(orbit);
  }

  const energyGeometry = new THREE.BufferGeometry();
  const energyPositions = new Float32Array(34 * 3);
  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2;
    energyPositions[index * 3] = Math.cos(angle) * (2.5 + (index % 5) * 0.22);
    energyPositions[index * 3 + 1] = Math.sin(angle) * 0.8;
    energyPositions[index * 3 + 2] = Math.sin(angle) * (2.5 + (index % 5) * 0.22);
  }
  energyGeometry.setAttribute("position", new THREE.BufferAttribute(energyPositions, 3));
  const energyParticles = new THREE.Points(energyGeometry, new THREE.PointsMaterial({ color: palette.hot, size: 0.065, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
  orbitGroup.add(energyParticles);

  const dustCount = 1350;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const radius = THREE.MathUtils.randFloat(3.1, 11.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    dustPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    dustPositions[index * 3 + 1] = radius * Math.cos(phi);
    dustPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: palette.faint, size: 0.025, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  const sprites = [];
  for (let index = 0; index < 170; index += 1) {
    const text = DATA_WORDS[index % DATA_WORDS.length];
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createCodeTexture(text, palette.bright), transparent: true, opacity: 0.18 + (index % 5) * 0.04, depthWrite: false, blending: THREE.AdditiveBlending }));
    const radius = index % 4 === 0 ? THREE.MathUtils.randFloat(2.0, 2.8) : THREE.MathUtils.randFloat(3.0, 6.8);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    sprite.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
    sprite.scale.set(0.26 + (index % 3) * 0.05, 0.065 + (index % 2) * 0.01, 1);
    sprite.userData = { phase: index * 0.37, drift: 0.04 + (index % 4) * 0.01 };
    dataGroup.add(sprite);
    sprites.push(sprite);
  }

  function setPalette(mode) {
    palette = paletteFor(mode);
    keyLight.color.setHex(palette.hot);
    shellLines.forEach((line, index) => line.material.color.setHex(index % 5 === 0 ? palette.bright : palette.mid));
    partialArcs.forEach((line, index) => line.material.color.setHex(index % 3 === 0 ? palette.bright : palette.mid));
    innerParticles.material.color.setHex(palette.gold);
    nucleusGlow.material.color.setHex(palette.mid);
    nucleusShell.material.color.setHex(palette.gold);
    nucleusCore.material.color.setHex(palette.hot);
    nucleusHot.material.color.setHex(palette.white);
    panelGroup.children.forEach((panel) => panel.material.color.setHex(palette.bright));
    orbitLines.forEach((line, index) => line.material.color.setHex(index % 4 === 0 ? palette.gold : palette.dim));
    energyParticles.material.color.setHex(palette.hot);
    dust.material.color.setHex(palette.faint);
    debris.forEach((mesh, index) => mesh.material.color.setHex(index % 4 === 0 ? palette.gold : palette.mid));
  }

  const clock = new THREE.Clock();
  function animate() {
    if (disposed) return;
    const elapsed = clock.getElapsedTime();
    const activityFactor = activity === "thinking" || activity === "scanning" ? 1.35 : activity === "alert" ? 1.6 : 1;
    const pulse = 1 + Math.sin(elapsed * 1.7) * 0.035 * activityFactor;
    nucleus.scale.setScalar(pulse);
    nucleusShell.rotation.x += 0.004 * activityFactor;
    nucleusShell.rotation.y -= 0.006 * activityFactor;
    innerGroup.rotation.y += 0.0018 * activityFactor;
    innerGroup.rotation.z = Math.sin(elapsed * 0.4) * 0.12;
    shellGroup.rotation.y -= 0.0007 * activityFactor;
    shellGroup.rotation.x = Math.sin(elapsed * 0.21) * 0.06;
    partialArcs.forEach((arc, index) => { arc.rotation.z += (index % 2 ? 1 : -1) * 0.0007 * activityFactor; });
    panelGroup.children.forEach((panel) => { panel.material.opacity = 0.11 + (Math.sin(elapsed * 1.7 + panel.userData.phase) + 1) * 0.045; });
    orbitLines.forEach((line) => { line.rotation.z += line.userData.speed * activityFactor; line.rotation.y += line.userData.speed * 0.35; });
    orbitGroup.rotation.y += 0.0008 * activityFactor;
    energyParticles.rotation.y += 0.0035 * activityFactor;
    energyParticles.rotation.x = Math.sin(elapsed * 0.7) * 0.13;
    debris.forEach((mesh) => {
      const { radius, angle, speed, tilt, phase } = mesh.userData;
      const nextAngle = angle + elapsed * speed * activityFactor;
      mesh.position.set(Math.cos(nextAngle) * radius, Math.sin(nextAngle * 1.7 + phase) * tilt, Math.sin(nextAngle) * radius);
      mesh.rotation.x += 0.01;
      mesh.rotation.y -= 0.012;
    });
    dataGroup.rotation.y -= 0.00045;
    sprites.forEach((sprite) => { sprite.material.opacity = 0.12 + (Math.sin(elapsed * 1.4 + sprite.userData.phase) + 1) * 0.06; sprite.position.y += Math.sin(elapsed * sprite.userData.drift + sprite.userData.phase) * 0.00025; });
    dust.rotation.y += 0.00012;
    dust.rotation.x = Math.sin(elapsed * 0.12) * 0.06;
    root.rotation.y += 0.0003 * activityFactor;
    root.rotation.y = rotationY + root.rotation.y % (Math.PI * 2);
    root.rotation.x = rotationX + Math.sin(elapsed * 0.25) * 0.035;
    camera.position.z += (zoom - camera.position.z) * 0.06;
    camera.position.x += (Math.sin(elapsed * 0.25) * 0.08 - camera.position.x) * 0.02;
    camera.position.y += (Math.cos(elapsed * 0.2) * 0.08 - camera.position.y) * 0.02;
    composer.render();
    requestAnimationFrame(animate);
  }
  animate();

  return {
    renderer,
    setZoom(nextZoom) { zoom = THREE.MathUtils.clamp(nextZoom, CORE_ZOOM_MIN, CORE_ZOOM_MAX); },
    setRotation(y, x = 0) { rotationY = y; rotationX = THREE.MathUtils.clamp(x, -0.8, 0.8); },
    setState(mode) { setPalette(mode); },
    setActivity(nextActivity) { activity = nextActivity || "idle"; },
    resize(nextWidth, nextHeight) { camera.aspect = nextWidth / nextHeight; camera.updateProjectionMatrix(); renderer.setSize(nextWidth, nextHeight); composer.setSize(nextWidth, nextHeight); },
    dispose() { disposed = true; disposeObject(scene); composer.dispose(); renderer.dispose(); if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); },
  };
}
