// Scroll storytelling: GSAP ScrollTrigger + Lenis when the CDN loads, IntersectionObserver fallback otherwise.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const progress = document.getElementById("progress");
function setChapter(id) { document.querySelectorAll("#chapters button").forEach(b => b.classList.toggle("active", b.dataset.target === id)); }
document.querySelectorAll("#chapters button").forEach(b => b.onclick = () => document.getElementById(b.dataset.target).scrollIntoView({ behavior: reduced ? "auto" : "smooth" }));
document.getElementById("replay").onclick = () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
function animateCounters(scope) {
  scope.querySelectorAll(".counter").forEach(el => {
    const to = +el.dataset.to; if (el.dataset.done) return; el.dataset.done = "1";
    const t0 = performance.now();
    (function tick(t) { const p = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(to * p).toLocaleString(); if (p < 1) requestAnimationFrame(tick); })(t0);
  });
}
if (window.gsap && window.ScrollTrigger && !reduced) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) { const lenis = new Lenis({ smoothWheel: true }); lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  gsap.utils.toArray(".reveal").forEach(el => gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } }));
  gsap.utils.toArray(".parallax").forEach(el => gsap.to(el, { y: -80 * (+el.dataset.speed || 0.4), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }));
  gsap.to("#progress", { width: "100%", ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });
  document.querySelectorAll(".chapter, .horizontal").forEach(sec => ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: s => { if (s.isActive) setChapter(sec.id); } }));
  document.querySelectorAll(".counter").forEach(el => ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => animateCounters(el.parentElement) }));
  if (window.matchMedia("(min-width: 761px)").matches) {
    gsap.to(".h-track", { x: () => -(document.querySelector(".h-track").scrollWidth - window.innerWidth), ease: "none", scrollTrigger: { trigger: ".horizontal", start: "top top", end: "+=1800", pin: true, scrub: 1, invalidateOnRefresh: true } });
  }
} else {
  // Fallback: content fully readable; reveal on scroll + progress bar via plain scroll listener.
  document.getElementById("cdnNote").classList.toggle("hidden", !!(window.gsap && window.ScrollTrigger));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = 1; animateCounters(e.target.closest("section") || document); } }), { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach(el => { el.style.transition = "opacity .6s"; io.observe(el); });
  window.addEventListener("scroll", () => {
    const h = document.documentElement, p = h.scrollTop / (h.scrollHeight - h.clientHeight);
    progress.style.width = (p * 100) + "%";
    document.querySelectorAll(".chapter, .horizontal").forEach(sec => { const r = sec.getBoundingClientRect(); if (r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.55) setChapter(sec.id); });
  }, { passive: true });
}
