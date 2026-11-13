// 3D solar system with Three.js (CDN). Real relative sizes & orbit speeds, scaled for viewing.
// Fallback: if Three.js fails to load, the data table below still works.
const PLANETS = [
  { name: "Mercury", color: 0x9c8e82, size: 0.38, dist: 6, speed: 4.74, diameter: 4879, day: "59 Earth days", moons: 0, fact: "Smallest planet — a year here is just 88 Earth days." },
  { name: "Venus", color: 0xe8c47a, size: 0.95, dist: 8.5, speed: 3.50, diameter: 12104, day: "243 Earth days", moons: 0, fact: "Hottest planet at 465°C — its thick CO2 atmosphere traps heat." },
  { name: "Earth", color: 0x3b82f6, size: 1.0, dist: 11, speed: 2.98, diameter: 12742, day: "24 hours", moons: 1, fact: "The only known world with liquid-water oceans and life." },
  { name: "Mars", color: 0xc1440e, size: 0.53, dist: 13.5, speed: 2.41, diameter: 6779, day: "24.6 hours", moons: 2, fact: "Home to Olympus Mons, the tallest volcano in the solar system." },
  { name: "Jupiter", color: 0xd8a06a, size: 3.5, dist: 18, speed: 1.31, diameter: 139820, day: "9.9 hours", moons: 95, fact: "Bigger than all other planets combined — its Great Red Spot is wider than Earth." },
  { name: "Saturn", color: 0xe3d0a0, size: 3.0, dist: 23, speed: 0.97, diameter: 116460, day: "10.7 hours", moons: 146, fact: "Its rings span 280,000 km yet are only about 10 metres thick." },
  { name: "Uranus", color: 0x7dd3e8, size: 1.6, dist: 28, speed: 0.68, diameter: 50724, day: "17.2 hours", moons: 28, fact: "It rolls around the Sun on its side, tilted 98 degrees." },
  { name: "Neptune", color: 0x3b5bdb, size: 1.55, dist: 32, speed: 0.54, diameter: 49244, day: "16.1 hours", moons: 16, fact: "Winds here reach 2,100 km/h — the fastest in the solar system." },
];
let speed = 1, paused = false, direction = 1, compare = false, sim = null;
const info = document.getElementById("info");
function showInfo(p) {
  info.innerHTML = `<h2>${p.name}</h2><p>${p.fact}</p><p>Diameter: <strong>${p.diameter.toLocaleString()} km</strong> · Day: <strong>${p.day}</strong> · Moons: <strong>${p.moons}</strong></p><p>Orbit speed: ${p.speed} (relative units) · Distance from Sun: ${p.dist} units</p>`;
}
const tbody = document.querySelector("#planetTable tbody");
PLANETS.forEach(p => {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${p.name}</td><td>${p.diameter.toLocaleString()}</td><td>${p.day}</td><td>${p.moons}</td>`;
  tr.onclick = () => showInfo(p);
  tbody.appendChild(tr);
});
document.getElementById("speedLabel").textContent = "Speed: 1×";
function setSpeedLabel() { document.getElementById("speedLabel").textContent = "Speed: " + (paused ? "paused" : (speed * direction).toFixed(1) + "×"); }
document.getElementById("pauseBtn").onclick = e => { paused = !paused; e.currentTarget.textContent = paused ? "▶ Resume" : "⏸ Pause"; setSpeedLabel(); };
document.getElementById("fasterBtn").onclick = () => { speed = Math.min(8, speed * 1.5); setSpeedLabel(); };
document.getElementById("slowerBtn").onclick = () => { speed = Math.max(0.1, speed / 1.5); setSpeedLabel(); };
document.getElementById("reverseBtn").onclick = () => { direction *= -1; setSpeedLabel(); };
document.getElementById("compareBtn").onclick = () => {
  compare = !compare;
  document.getElementById("compareBtn").textContent = compare ? "↩ Back to orbits" : "🔍 Compare sizes";
  if (sim) sim.setCompare(compare);
};
if (window.THREE) {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 2, 0.1, 500);
  camera.position.set(0, 26, 42);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sunLight = new THREE.PointLight(0xffffff, 2, 0); sunLight.position.set(0, 0, 0); scene.add(sunLight);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  scene.add(sun);
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: 900 }, () => (Math.random() - 0.5) * 300), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 }));
  scene.add(stars);
  const bodies = PLANETS.map(p => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size * 0.55, 24, 24), new THREE.MeshStandardMaterial({ color: p.color }));
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * p.dist, 0, Math.sin(i / 128 * Math.PI * 2) * p.dist))), new THREE.LineBasicMaterial({ color: 0x334155 }));
    scene.add(orbit);
    const pivot = new THREE.Group(); pivot.add(mesh); scene.add(pivot);
    mesh.userData.planet = p;
    if (p.name === "Saturn") { const ring = new THREE.Mesh(new THREE.RingGeometry(p.size * 0.75, p.size * 1.25, 48), new THREE.MeshBasicMaterial({ color: 0xd6c28a, side: THREE.DoubleSide })); ring.rotation.x = Math.PI / 2.4; mesh.add(ring); }
    return { p, mesh, pivot, angle: Math.random() * Math.PI * 2 };
  });
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let dragging = false, px = 0, py = 0, theta = 0, phi = 0.5, radius = 50;
  canvas.addEventListener("pointerdown", e => { dragging = true; px = e.clientX; py = e.clientY; });
  window.addEventListener("pointerup", () => dragging = false);
  canvas.addEventListener("pointermove", e => { if (!dragging) return; theta -= (e.clientX - px) * 0.005; phi = Math.max(0.1, Math.min(1.4, phi - (e.clientY - py) * 0.005)); px = e.clientX; py = e.clientY; });
  canvas.addEventListener("wheel", e => { radius = Math.max(14, Math.min(90, radius + e.deltaY * 0.03)); }, { passive: true });
  canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(bodies.map(b => b.mesh))[0];
    if (hit) showInfo(hit.object.userData.planet);
  });
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize); resize();
  const clock = new THREE.Clock();
  sim = {
    setCompare(on) {
      bodies.forEach((b, i) => {
        if (on) { b.mesh.position.set(-16 + i * 4.6, 0, 0); b.pivot.rotation.y = 0; }
        else { b.angle = Math.random() * Math.PI * 2; }
      });
      camera.position.set(0, on ? 4 : 26, on ? 34 : 42);
    }
  };
  (function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (!paused) bodies.forEach(b => {
      if (compare) return;
      b.angle += dt * 0.25 * (b.p.speed / 2.98) * speed * direction;
      b.mesh.position.set(Math.cos(b.angle) * b.p.dist, 0, Math.sin(b.angle) * b.p.dist);
      b.mesh.rotation.y += dt * 0.2;
    });
    sun.rotation.y += dt * 0.05;
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  })();
} else {
  document.getElementById("fallback").classList.remove("hidden");
  document.getElementById("scene").style.display = "none";
}
