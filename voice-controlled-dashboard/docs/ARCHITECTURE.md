# Architecture

`app.js` has two layers:

1. **Pure command layer** — `matchCommand(text)` and `didYouMean(text)` are
   plain functions with no DOM dependency, so they are unit-tested in Node.
2. **Browser layer** — `SpeechRecognition` (or `webkitSpeechRecognition`)
   feeds transcripts into `runCommand()`; interim results show live in the
   transcript panel; final results show confidence and run the command.
   `speechSynthesis` reads values aloud.

If the Speech API is absent, the page says so plainly and the typed-command
form provides the same commands offline.

## Production needs

- Recognition is Chrome/Edge online-only; for a kiosk, consider a local
  model (Vosk / Whisper) instead of the browser API.
- Never act on low-confidence transcripts for destructive actions — require
  confirmation (this dashboard only navigates, so it is safe).
