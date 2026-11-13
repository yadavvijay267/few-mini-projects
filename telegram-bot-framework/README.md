# Telegram Bot Framework (Python)

A reusable Telegram bot starter built on the **raw Bot API** (plain
`requests` calls — no heavy framework). Command routing, inline keyboards,
conversation-ready context objects, a plugin system and an admin/allow-list
are all included, so shipping a new bot is a matter of dropping in a file.

## Features

- **Command router** — `@router.command("name")` registers a handler;
  `/help` is generated automatically from handler docstrings
- **Inline keyboards** — `inline_keyboard()` helper, callback queries routed
  in `handle_update()`
- **Plugin system** (the stand-out feature) — drop a `.py` file into
  `src/plugins/` defining `register(router)` and it becomes a command on
  the next start. No registration code anywhere else. Ships with `/ping`
  and `/joke` examples
- **Admin-only commands** (`/stats`) and a **user allow-list** middleware
- **SQLite user store** — every user the bot meets is remembered
- **Offline demo** — `--demo` simulates a full conversation with no token
  and no network

## Tech stack

Python 3, `requests`, SQLite (standard library).

## How to run

```bash
pip install -r requirements.txt

# Offline demo — no token, no network
python3 src/bot.py --demo

# Against the real Telegram API (get a token from @BotFather)
export TELEGRAM_BOT_TOKEN='123456:ABC-DEF...'
python3 src/bot.py --poll --admin 123456789

# Restrict the bot to specific users
python3 src/bot.py --poll --allow 111111 222222
```

> Never commit a bot token. It comes only from the `TELEGRAM_BOT_TOKEN`
> environment variable.

## Adding a command

Create `src/plugins/weather.py`:

```python
def register(router):
    @router.command("weather")
    def weather(ctx, update):
        # Show the weather for the user
        return ctx.reply("Sunny, 28°C (plug in a real API here).")
```

Restart the bot — `/weather` now exists and appears in `/help`.

## Screenshots

See `screenshots/SCREENSHOTS.md`.

## Tests

```bash
python3 -m pytest tests/ -v
```

## License

MIT — see `LICENSE`. Copyright (c) 2026 Clamor.
