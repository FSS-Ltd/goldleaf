import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type SceneOptions = {
  letters: string[];
  fontFamily: string;
  /** 1 = full plant. Lower values keep a small sprout (used on the 404 page). */
  maxGrowth?: number;
  /** Plant also grows as the page scrolls (hero only). */
  scrollGrowth?: boolean;
  reducedMotion: boolean;
  onLost: () => void;
};

const CLAY = 0xb95f25;
const GOLD = 0xdaa835;
const PAPER_DEEP = "#f6eee2";
const PAPER = "#fef8f3";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function makeLeafGeometry(length: number, width: number) {
  const geo = new THREE.PlaneGeometry(1, 1, 8, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const v = pos.getY(i) + 0.5; // 0 at the base, 1 at the tip
    const profile = Math.sin(Math.PI * Math.pow(v, 0.72)); // narrow base, pointed tip
    const px = x * 2 * profile * width * 0.5;
    const py = v * length;
    const pz = -(v * v) * 0.32 * length + px * px * 0.9; // curl back and cup slightly
    pos.setXYZ(i, px, py, pz);
  }
  geo.computeVertexNormals();
  return geo;
}

function letterTexture(letter: string, fontFamily: string, dark: boolean, gold: boolean) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = dark ? "#06451d" : gold ? "#ecd081" : PAPER_DEEP;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = dark ? "#0b5a2a" : gold ? "#daa835" : "#e3d7c3";
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, size - 14, size - 14);
  ctx.fillStyle = dark ? PAPER : "#06451d";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const fontSize = letter.length > 1 ? 130 : 170;
  ctx.font = `600 ${fontSize}px ${fontFamily}, Georgia, serif`;
  ctx.fillText(letter, size / 2, size / 2 + fontSize * 0.34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(30,20,10,0.38)");
  g.addColorStop(1, "rgba(30,20,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mountSeedling(host: HTMLElement, opts: SceneOptions): () => void {
  const maxGrowth = opts.maxGrowth ?? 1;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.95;

  const key = new THREE.DirectionalLight(0xfff1d6, 1.7);
  key.position.set(3, 4, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.55, 9.4);
  camera.lookAt(0, 0.55, 0);

  const root = new THREE.Group();
  scene.add(root);

  // Pot: lathe profile, terracotta
  const potProfile = [
    [0.001, 0], [0.5, 0], [0.56, 0.06], [0.8, 0.86], [0.8, 0.9], [0.93, 0.9], [0.93, 1.1], [0.82, 1.1], [0.78, 1.02], [0.001, 1.02],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const potMat = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.62, metalness: 0.02 });
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 56), potMat);
  pot.position.y = -1.02;
  root.add(pot);

  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(0.77, 40),
    new THREE.MeshStandardMaterial({ color: 0x3f2614, roughness: 1 }),
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0;
  root.add(soil);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.03;
  root.add(shadow);

  // Plant
  const plant = new THREE.Group();
  root.add(plant);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, 0.55, 0.02),
    new THREE.Vector3(-0.06, 1.05, 0.04),
    new THREE.Vector3(0.1, 1.55, 0.02),
  ]);
  const radial = 10;
  const tubular = 48;
  const stemGeo = new THREE.TubeGeometry(curve, tubular, 0.034, radial, false);
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: GOLD,
    metalness: 0.88,
    roughness: 0.3,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
    envMapIntensity: 1.15,
  });
  const stem = new THREE.Mesh(stemGeo, goldMat);
  plant.add(stem);
  const stemIndexCount = stemGeo.index!.count;
  const stepIndices = radial * 6;

  type LeafDef = { t: number; length: number; width: number; rotZ: number; rotY: number; start: number; scrollAt?: [number, number] };
  const defs: LeafDef[] = [
    { t: 1.0, length: 1.15, width: 0.62, rotZ: -0.62, rotY: 0.25, start: 0.45 },
    { t: 0.72, length: 0.92, width: 0.42, rotZ: 1.12, rotY: -0.2, start: 0.28 },
    { t: 0.5, length: 0.78, width: 0.4, rotZ: -1.15, rotY: 0.35, start: 0, scrollAt: [0.1, 0.55] },
    { t: 0.32, length: 0.62, width: 0.34, rotZ: 1.3, rotY: -0.3, start: 0, scrollAt: [0.45, 0.95] },
  ];
  const leaves = defs.map((d) => {
    const pivot = new THREE.Group();
    const p = curve.getPoint(d.t);
    pivot.position.copy(p);
    const mesh = new THREE.Mesh(makeLeafGeometry(d.length, d.width), goldMat);
    pivot.add(mesh);
    pivot.rotation.set(0.15, d.rotY, d.rotZ);
    pivot.scale.setScalar(0.001);
    plant.add(pivot);
    return { d, pivot, baseRotZ: d.rotZ };
  });

  // Letter tiles
  const small = window.innerWidth < 768;
  const letters = small ? opts.letters.slice(0, Math.min(opts.letters.length, 5)) : opts.letters;
  const tileGeo = new RoundedBoxGeometry(0.62, 0.62, 0.16, 3, 0.09);
  const textures: THREE.Texture[] = [];
  const tiles = letters.map((letter, i) => {
    const tex = letterTexture(letter, opts.fontFamily, i % 4 === 0, i % 4 === 2);
    textures.push(tex);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0 });
    const mesh = new THREE.Mesh(tileGeo, mat);
    mesh.scale.setScalar(0.001);
    root.add(mesh);
    const angle = (i / letters.length) * Math.PI * 2 + 0.5;
    return { mesh, angle, radius: 1.45 + (i % 3) * 0.17, height: 0.15 + ((i * 0.37) % 1.5), phase: i * 1.3 };
  });

  let width = 1;
  let height = 1;
  const resize = () => {
    const r = host.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(() => {
    resize();
    if (opts.reducedMotion) render(2.5);
  });
  ro.observe(host);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!opts.reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });

  let scrollProgress = 0;
  const onScroll = () => {
    scrollProgress = opts.scrollGrowth ? clamp(window.scrollY / (window.innerHeight * 0.85)) : 0;
  };
  onScroll();
  if (!opts.reducedMotion && opts.scrollGrowth) window.addEventListener("scroll", onScroll, { passive: true });

  function render(t: number) {
    // intro: t seconds since start. 0..2.4 grows the plant.
    const intro = opts.reducedMotion ? 1 : clamp(t / 2.4);
    const grow = easeOutCubic(intro) * maxGrowth;

    stemGeo.setDrawRange(0, Math.max(stepIndices, Math.floor((stemIndexCount * clamp(grow * 1.15)) / stepIndices) * stepIndices));

    leaves.forEach((l, i) => {
      let s: number;
      if (l.d.scrollAt) {
        const [a, b] = l.d.scrollAt;
        const sp = opts.reducedMotion ? 1 : clamp((scrollProgress - a) / (b - a));
        s = easeOutBack(sp) * (intro > 0.95 ? 1 : 0);
        if (opts.reducedMotion || maxGrowth < 1) s = maxGrowth < 1 ? 0 : s;
      } else {
        const lp = clamp((intro - l.d.start) / 0.5);
        s = easeOutBack(lp) * (maxGrowth < 1 ? Math.min(1, maxGrowth * 1.4) : 1);
        if (maxGrowth < 1 && i > 0) s = 0;
      }
      l.pivot.scale.setScalar(Math.max(0.001, s));
      const sway = opts.reducedMotion ? 0 : Math.sin(t * 1.25 + i * 1.7) * 0.05;
      l.pivot.rotation.z = l.baseRotZ * (0.55 + 0.45 * clamp(s)) + sway;
    });

    const sway = opts.reducedMotion ? 0 : Math.sin(t * 0.8) * 0.025;
    plant.rotation.z = sway;
    plant.scale.setScalar(1 + (opts.scrollGrowth ? scrollProgress * 0.1 : 0));

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    root.rotation.y = pointer.x * 0.45;
    root.rotation.x = pointer.y * 0.08;

    tiles.forEach((tile, i) => {
      const appear = opts.reducedMotion ? 1 : clamp((t - 0.6 - i * 0.12) / 0.7);
      tile.mesh.scale.setScalar(Math.max(0.001, easeOutBack(appear)));
      const a = tile.angle + (opts.reducedMotion ? 0 : t * 0.1);
      tile.mesh.position.set(
        Math.cos(a) * tile.radius,
        tile.height + (opts.reducedMotion ? 0 : Math.sin(t * 0.9 + tile.phase) * 0.07) - 0.4,
        Math.sin(a) * tile.radius * 0.8,
      );
      tile.mesh.rotation.set(Math.sin(t * 0.5 + tile.phase) * 0.14, Math.sin(t * 0.4 + tile.phase) * 0.35 + Math.cos(a) * 0.25, Math.cos(t * 0.6 + tile.phase) * 0.12);
    });

    renderer.render(scene, camera);
  }

  let raf = 0;
  let running = false;
  let visible = true;
  const t0 = performance.now();
  let pausedAt = 0;
  let offset = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    render((performance.now() - t0 - offset) / 1000);
  };
  const start = () => {
    if (running || opts.reducedMotion) return;
    running = true;
    if (pausedAt) offset += performance.now() - pausedAt;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    pausedAt = performance.now();
    cancelAnimationFrame(raf);
  };
  const sync = () => (visible && !document.hidden ? start() : stop());
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);

  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
    opts.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  if (opts.reducedMotion) render(2.5);
  else start();

  return () => {
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    canvas.removeEventListener("webglcontextlost", onLost);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    [potMat, goldMat, tileGeo].forEach((x) => x.dispose());
    textures.forEach((x) => x.dispose());
    env.texture.dispose();
    pmrem.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
