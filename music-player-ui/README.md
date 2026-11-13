# Music Player UI

A Spotify-style player with playlist, queue, seek bar, volume, shuffle and repeat — tracks are synthesized live with the Web Audio API, and a canvas visualiser draws from the analyser node.

## Features

- Playlist with search and sort; queue management
- Play/pause, next/previous, shuffle, repeat modes (all / one / off)
- Seek bar with time display and volume control
- Keyboard shortcuts (space, arrows, N) and mini-player mode
- Live audio visualiser drawn on canvas from the Web Audio analyser node

## Tech Stack

HTML, CSS, vanilla JavaScript, Web Audio API (OscillatorNode + AnalyserNode)

## How to Run

Open `src/index.html` and press play. Tracks are generated melodies (no audio files needed). Use the seek bar, volume slider, queue buttons, and keyboard shortcuts (Space, arrows, N).

No build step and no API key are needed. Open `src/index.html` in any modern
browser, or serve the folder:

```bash
cd src
python3 -m http.server 8000
# then open http://localhost:8000
```

## Screenshots

See [`screenshots/SCREENSHOTS.md`](screenshots/SCREENSHOTS.md) for where to
place captures of the running app.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Clamor.
