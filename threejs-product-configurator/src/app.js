// Aura Chair configurator — chair built from Three.js primitives (original geometry).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export const BASE_PRICE = 349;
export const COLORS = { Ocean: 0x2563eb, Forest: 0x166534, Graphite: 0x334155, Sunset: 0xea580c, Ivory: 0xe7e5e4 };
export const MATERIALS = { fabric: { price: 0, roughness: 0.9, metalness: 0 }, leather: { price: 120, roughness: 0.45, metalness: 0.05 }, mesh: { price: 60, roughness: 0.7, metalness: 0.1 } };
export const ACCESSORIES = { headrest: 45, lumbar: 35, armrests: 80 };
export function computePrice(state) {
  let p = BASE_PRICE + MATERIALS[state.material].price;
  for (const [k, on] of Object.entries(state.accessories)) if (on) p += ACCESSORIES[k];
  return p;
}
const state = { color: "Ocean", material: "fabric", accessories: { headrest: false, lumbar: false, armrests: false } };
// --- restore from URL (share link) ---
const params = new URLSearchParams(location.search);
if (COLORS[params.get("color")]) state.color = params.get("color");
if (MATERIALS[params.get("material")]) state.material = params.get("material");
for (const k of Object.keys(state.accessories)) state.accessories[k] = params.get(k) === "1";
// --- UI ---
const $ = (id) => document.getElementById(id);
const colorsEl = $("colors");
for (const [name, hex] of Object.entries(COLORS)) {
  const b = document.createElement("button");
  b.className = "swatch" + (name === state.color ? " selected" : "");
  b.style.background = "#" + hex.toString(16).padStart(6, "0");
  b.title = name; b.setAttribute("aria-label", name);
  b.onclick = () => { state.color = name; document.querySelectorAll(".swatch").forEach((s) => s.classList.remove("selected")); b.classList.add("selected"); apply(); };
  colorsEl.appendChild(b);
}
document.querySelectorAll('input[name="material"]').forEach((r) => { r.checked = r.value === state.material; r.onchange = () => { state.material = r.value; apply(); }; });
for (const k of Object.keys(state.accessories)) { const el = $("acc-" + k); el.checked = state.accessories[k]; el.onchange = () => { state.accessories[k] = el.checked; apply(); }; }
let chair, headrestMesh, lumbarMesh, armL, armR, renderer, controls, autoRotate = true;
function updatePrice() { $("price").textContent = "$" + computePrice(state); }
function apply() {
  updatePrice();
  const url = new URL(location.href);
  url.searchParams.set("color", state.color); url.searchParams.set("material", state.material);
  for (const [k, on] of Object.entries(state.accessories)) url.searchParams.set(k, on ? "1" : "0");
  history.replaceState(null, "", url);
  if (!chair) return;
  const mat = MATERIALS[state.material];
  chair.traverse((o) => { if (o.isMesh && o.userData.upholstery) { o.material.color.setHex(COLORS[state.color]); o.material.roughness = mat.roughness; o.material.metalness = mat.metalness; } });
  if (headrestMesh) headrestMesh.visible = state.accessories.headrest;
  if (lumbarMesh) lumbarMesh.visible = state.accessories.lumbar;
  if (armL) { armL.visible = state.accessories.armrests; armR.visible = state.accessories.armrests; }
}
$("autorotate").onclick = (e) => { autoRotate = !autoRotate; if (controls) controls.autoRotate = autoRotate; e.target.textContent = autoRotate ? "⏸ Pause auto-rotate" : "▶ Resume auto-rotate"; };
$("screenshot").onclick = () => { if (!renderer) return; renderer.render(renderer.scene, renderer.camera);
  const a = document.createElement("a"); a.download = "aura-chair.png"; a.href = renderer.domElement.toDataURL("image/png"); a.click(); };
$("share").onclick = async () => { try { await navigator.clipboard.writeText(location.href); $("share-msg").textContent = "Share link copied!"; } catch { $("share-msg").textContent = "Copy this URL: " + location.href; } };
// --- 3D scene ---
try {
  const container = $("viewport");
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe2e8f0); renderer.scene = scene;
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(3.2, 2.2, 4.2); renderer.camera = camera;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true; controls.autoRotateSpeed = 1.2; controls.enableDamping = true; controls.target.set(0, 0.9, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(4, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.4); fill.position.set(-4, 3, -2); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const upholstery = new THREE.MeshStandardMaterial({ color: COLORS[state.color], roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.8 });
  chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 1.05), upholstery); seat.position.y = 0.95; seat.userData.upholstery = true; chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.25, 0.13), upholstery); back.position.set(0, 1.65, -0.52); back.rotation.x = -0.12; back.userData.upholstery = true; chair.add(back);
  headrestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.12), upholstery); headrestMesh.position.set(0, 2.42, -0.6); headrestMesh.userData.upholstery = true; headrestMesh.visible = false; chair.add(headrestMesh);
  lumbarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.1), upholstery); lumbarMesh.position.set(0, 1.25, -0.44); lumbarMesh.userData.upholstery = true; lumbarMesh.visible = false; chair.add(lumbarMesh);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 16), metal); post.position.y = 0.55; chair.add(post);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.09), metal);
    leg.position.set(Math.cos(a) * 0.28, 0.14, Math.sin(a) * 0.28); leg.rotation.y = -a; chair.add(leg); }
  const mkArm = (side) => { const g = new THREE.Group();
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), metal); v.position.y = 0.2; g.add(v);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.55), upholstery); pad.position.y = 0.42; pad.userData.upholstery = true; g.add(pad);
    g.position.set(side * 0.62, 1.0, 0); g.visible = false; return g; };
  armL = mkArm(-1); armR = mkArm(1); chair.add(armL, armR);
  scene.add(chair);
  addEventListener("resize", () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); });
  (function tick() { requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); })();
} catch (err) {
  document.getElementById("fallback").hidden = false;
  console.warn("3D failed to start:", err);
}
apply();
