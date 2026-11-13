# Architecture — GSAP Scroll Storytelling Site

- `src/index.html` — hero + five chapters; chapter 3 is a three-panel horizontal track.
- `src/app.js` — if GSAP + ScrollTrigger load (and reduced-motion is off), it registers pinned scrubbed animations: `.reveal` fade-ups, parallax visuals, a scrubbed progress bar, chapter activation via ScrollTrigger, and a pinned horizontal-scroll section on desktop. Otherwise it falls back to an IntersectionObserver reveal + a plain scroll listener for the progress bar and chapter indicator, so the story is never blocked by the CDN. Lenis smooth scroll is wired into GSAP's ticker when available.
- Counters animate once when scrolled into view in both modes.
