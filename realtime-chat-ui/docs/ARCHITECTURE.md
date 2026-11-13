# Architecture — Real-Time Chat UI

- `src/index.html` — sidebar (rooms + search), chat pane, composer, emoji bar.
- `src/app.js` — state is `{ rooms: { roomId: [messages] } }` in `localStorage` (`chat-ui-v1`). Messages carry `ticks` (1 = sent, 2 = read) and a `reactions` map. `simulateReply()` fakes a teammate typing then replying; a 45s interval injects ambient messages into other rooms so unread badges move. Search scans every room and jumps to the first hit; 'jump to unread' scrolls to the first unread message in the current room.
- To go real-time, replace `simulateReply` / the interval with a Socket.io client emitting `message` events into the same state shape.
