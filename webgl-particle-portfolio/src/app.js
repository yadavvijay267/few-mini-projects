// Particle hero: points spell "C" on load, disperse into a mouse-reactive field.
// Falls back gracefully if the Three.js CDN is unreachable; respects reduced motion.
(function () {
  const canvas = document.getElementById("particles");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const THEMES = { ocean: 0x38bdf8, sunset: 0xfb923c, forest: 0x4ade80 };
  let theme = "ocean";
  document.querySelectorAll(".themes button").forEach((b) => b.addEventListener("click", () => {
    theme = b.dataset.theme;
    document.querySelectorAll(".themes button").forEach((x) => x.classList.toggle("active", x === b));
    if (window.__setParticleColor) window.__setParticleColor(THEMES[theme]);
  }));
  // GSAP reveals (skip if CDN failed — content stays visible)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".reveal").forEach((el) => gsap.from(el, { opacity: 0, y: 40, duration: 0.8, scrollTrigger: { trigger: el, start: "top 85%" } }));
  }
  if (typeof THREE === "undefined") { document.getElementById("fallback").hidden = false; return; }
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 9;
  const COUNT = 900;
  const field = new Float32Array(COUNT * 3);       // dispersed positions
  const letter = new Float32Array(COUNT * 3);      // "C" positions
  const target = new Float32Array(COUNT * 3);      // current targets
  for (let i = 0; i < COUNT; i++) {
    field[i * 3] = (Math.random() - 0.5) * 16; field[i * 3 + 1] = (Math.random() - 0.5) * 9; field[i * 3 + 2] = (Math.random() - 0.5) * 4;
    // letter "C": points along an arc
    const a = -1.1 + (i / COUNT) * 4.4; // arc from -63deg to +189deg-ish, gap on the right
    const r = 2.6 + (Math.random() - 0.5) * 0.25;
    letter[i * 3] = Math.cos(a) * r; letter[i * 3 + 1] = Math.sin(a) * r; letter[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  target.set(letter);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(target.slice(), 3));
  const mat = new THREE.PointsMaterial({ color: THEMES.ocean, size: 0.06, transparent: true, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  window.__setParticleColor = (hex) => { mat.color.setHex(hex); };
  const mouse = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; });
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();
  let dispersed = false, start = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const pos = geo.attributes.position.array;
    const elapsed = (now - start) / 1000;
    if (!dispersed && elapsed > 2.2) dispersed = true; // spell "C" for ~2.2s, then disperse
    const scroll = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
    for (let i = 0; i < COUNT; i++) {
      const goal = dispersed ? field : letter;
      const tx = goal[i * 3] + mouse.x * 0.6, ty = goal[i * 3 + 1] + mouse.y * 0.4 - scroll * 1.5, tz = goal[i * 3 + 2];
      const k = reduced ? 1 : 0.03; // reduced motion: snap, don't drift
      pos[i * 3] += (tx - pos[i * 3]) * k; pos[i * 3 + 1] += (ty - pos[i * 3 + 1]) * k; pos[i * 3 + 2] += (tz - pos[i * 3 + 2]) * k;
    }
    geo.attributes.position.needsUpdate = true;
    if (!reduced) points.rotation.y = mouse.x * 0.15;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
})();
