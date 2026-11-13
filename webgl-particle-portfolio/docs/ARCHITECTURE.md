# Architecture

One full-screen Three.js `Points` cloud on a fixed canvas behind the page.
Two position sets: the letter "C" (points along an arc) and a random field.
For the first ~2.2 s the targets are the letter; then they lerp to the field,
with the mouse offset and scroll progress added every frame. GSAP +
ScrollTrigger reveal sections; the theme switcher recolours the material.

Reduced motion: the lerp factor becomes 1 (snap) and rotation stops, so the
field is static. If the Three.js CDN fails, a banner shows and the portfolio
content remains fully readable.
