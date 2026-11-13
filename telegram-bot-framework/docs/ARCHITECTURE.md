# Architecture

```
src/bot.py
├── Router        handlers dict + middleware chain; help from docstrings
├── Context       per-update helper: chat_id, user, args, reply(), is_admin()
├── Bot           API calls, SQLite user store, plugin loader, poll loop
└── plugins/      one file = one feature; register(router) is the contract

Flow of an update:
    getUpdates (long poll) -> handle_update()
        -> callback_query? answer it
        -> Router.dispatch(): middlewares (allow-list, remember user)
        -> handler(ctx, update) -> ctx.reply(...)
```

## Design choices

- **Raw Bot API instead of python-telegram-bot**: fewer dependencies, the
  HTTP calls are visible, and the demo can run fully offline by swapping
  `send_message` for a print.
- **Plugins are discovered by convention**: any `*.py` in `src/plugins/`
  with a `register(router)` function is loaded. Files starting with `_`
  are ignored.
- **Help from docstrings**: the first line of a handler's docstring is its
  help text, so documentation can never drift from the code.
- **Middleware returns False to block**: the allow-list is one such
  middleware; rate limiting or logging can be added the same way.
