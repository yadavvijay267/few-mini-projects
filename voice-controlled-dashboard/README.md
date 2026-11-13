# 99. Voice-Controlled Dashboard (Web Speech API)

A dashboard you can control by voice: "show sales", "dark mode", "next slide"
— with a visible command list, a live transcript of exactly what the browser
heard, confidence display, and a "did you mean" fallback. Typed commands work
too, for browsers without speech support.

## Features

- Voice commands for navigation (show sales / users / revenue), theme, and chart switching
- Visible command list + live transcript panel (the stand-out twist — debugging voice is usually invisible)
- Confidence display and a "did you mean" suggestion when a command is not recognised
- Typed-command fallback for browsers without the Web Speech API
- "Read values aloud" — the dashboard speaks the current numbers back (speechSynthesis)

## Tech stack

JavaScript, Web Speech API (built into Chrome/Edge), plain HTML/CSS

## How to run

```bash
python3 -m http.server 8000 --directory src   # open http://localhost:8000
# Chrome/Edge recommended; microphone permission required for voice.
python3 tests/test_voice.py
```

## Screenshots

See [`screenshots/`](screenshots/).

## License

MIT — see [LICENSE](LICENSE).
