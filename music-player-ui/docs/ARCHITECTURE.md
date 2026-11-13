# Architecture — Music Player UI

- `src/index.html` — now-playing bar, visualiser canvas, playlist + queue panels.
- `src/app.js` — each track is data: `{ bpm, notes: [[midi, beats], ...] }`. `schedule()` creates triangle+sine oscillators per note, routed through a GainNode into an AnalyserNode and out to the speakers, so the visualiser reads real frequency data. Playback position is tracked from `AudioContext.currentTime`; seeking re-schedules from that offset. Queue is a plain array consumed by `next()`. Repeat cycles off → all → one.
- Because audio is synthesized, the player works fully offline with zero media files.
