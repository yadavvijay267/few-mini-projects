// AR business card: starts the AR.js scene on demand; falls back to a
// Three.js 3D card preview when there is no camera / the AR CDN failed.
const $ = (id) => document.getElementById(id);
$("btn-ar").addEventListener("click", () => {
  if (typeof AFRAME === "undefined") {
    $("status").textContent = "AR.js did not load (CDN unreachable). Try the 3D preview instead.";
    return;
  }
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    $("status").textContent = "Camera access needs HTTPS (or localhost). Serve over HTTPS and try again.";
    return;
  }
  $("ui").hidden = true;
  $("scene").hidden = false;
  $("status").textContent = "Point the camera at the printed Hiro marker.";
});
$("btn-preview").addEventListener("click", () => { $("preview").hidden = false; startPreview(); });
$("btn-close-preview").addEventListener("click", () => { $("preview").hidden = true; });
function startPreview() {
  if (typeof THREE === "undefined" || window.__previewStarted) return;
  window.__previewStarted = true;
  const canvas = $("preview-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1e293b);
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 3.2); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1); key.position.set(3, 4, 3); scene.add(key);
  const card = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
  card.add(body);
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 6),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.4 }));
  hex.rotation.x = Math.PI / 2; hex.position.set(-0.7, 0, 0.06); card.add(hex);
  scene.add(card);
  let dragging = false, px = 0, ry = 0;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; px = e.clientX; });
  addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointermove", (e) => { if (dragging) { ry += (e.clientX - px) * 0.01; px = e.clientX; } });
  (function tick() { requestAnimationFrame(tick); if (!dragging) ry += 0.005; card.rotation.y = ry; renderer.render(scene, camera); })();
}
