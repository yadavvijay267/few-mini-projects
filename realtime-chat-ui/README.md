# Real-Time Chat UI (Frontend)

A polished messenger interface with rooms, typing indicators, read receipts, emoji reactions and reply threading — with a simulated live feed so it feels real with no backend.

## Features

- Multiple rooms/channels with unread badges
- Typing indicator, read receipts (✓/✓✓), and message timestamps
- Emoji reactions and reply-to-message threading
- Responsive mobile layout with a slide-in sidebar
- Message search across rooms and a 'jump to unread' button

## Tech Stack

HTML, CSS, vanilla JavaScript, simulated live feed (ready to swap for a Socket.io backend), localStorage

## How to Run

Open `src/index.html`. Send a message — a teammate 'types' and replies. Switch rooms, react to messages, reply to one, search all rooms from the sidebar, and resize to phone width for the slide-in sidebar.

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
