#!/usr/bin/env python3
"""Telegram Bot Framework — a reusable starter built on the raw Bot API.

Features: a command router with help text generated from docstrings, inline
keyboards, conversation flows, a plugin folder (drop in a .py file and it
becomes a command), admin-only commands and a user allow-list.

No bot token is embedded anywhere. Set TELEGRAM_BOT_TOKEN in the
environment to run against the real API; without it, --demo simulates
updates offline.

Usage:
    python3 src/bot.py --demo                    # offline simulation
    python3 src/bot.py --poll                    # long-poll the real API
    TELEGRAM_BOT_TOKEN=... python3 src/bot.py --poll
"""
import argparse
import importlib.util
import json
import os
import sqlite3
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:  # pragma: no cover
    print("requests is required: pip install -r requirements.txt", file=sys.stderr)
    raise

BASE_DIR = Path(__file__).resolve().parent
PLUGINS_DIR = BASE_DIR / "plugins"
DB_PATH = BASE_DIR.parent / "bot_users.db"


class Router:
    """Command router. Handlers are registered with @router.command and
    help text is generated from their docstrings."""

    def __init__(self):
        self.handlers = {}   # name -> (func, admin_only)
        self.middlewares = []

    def command(self, name, admin_only=False):
        def decorator(func):
            self.handlers[name] = (func, admin_only)
            return func
        return decorator

    def middleware(self, func):
        self.middlewares.append(func)
        return func

    def help_text(self):
        lines = ["Available commands:"]
        for name in sorted(self.handlers):
            func, admin = self.handlers[name]
            doc = (func.__doc__ or "").strip().splitlines()[0] if func.__doc__ else ""
            tag = " [admin]" if admin else ""
            lines.append(f"/{name}{tag} — {doc}")
        return "\n".join(lines)

    def dispatch(self, ctx, update):
        """Run middlewares, then the matching command handler."""
        for mw in self.middlewares:
            if mw(ctx, update) is False:
                return "blocked by middleware"
        text = (update.get("message") or {}).get("text", "")
        if not text.startswith("/"):
            return ctx.reply("Send a command — try /help.")
        name = text[1:].split()[0].split("@")[0]
        entry = self.handlers.get(name)
        if entry is None:
            return ctx.reply(f"Unknown command /{name}. Try /help.")
        func, admin_only = entry
        if admin_only and not ctx.is_admin():
            return ctx.reply("That command is admin-only.")
        return func(ctx, update)


class Context:
    """Everything a handler needs: the bot, the update, and reply helpers."""

    def __init__(self, bot, update):
        self.bot = bot
        self.update = update
        message = update.get("message") or update.get("callback_query", {}).get("message") or {}
        self.chat_id = message.get("chat", {}).get("id")
        self.user = (update.get("message") or {}).get("from", {})
        self.args = ((update.get("message") or {}).get("text", "") or "").split()[1:]

    def reply(self, text, reply_markup=None):
        return self.bot.send_message(self.chat_id, text, reply_markup)

    def is_admin(self):
        return self.bot.is_admin(self.user.get("id"))


def inline_keyboard(buttons):
    """buttons: list of rows, each row a list of (label, callback_data)."""
    return {"inline_keyboard": [[{"text": label, "callback_data": data}
                                 for label, data in row] for row in buttons]}


class Bot:
    def __init__(self, token, admin_ids=None, allowed_ids=None, db_path=DB_PATH):
        self.token = token
        self.api = f"https://api.telegram.org/bot{token}" if token else None
        self.admin_ids = set(admin_ids or [])
        self.allowed_ids = set(allowed_ids or [])
        self.router = Router()
        self.db_path = Path(db_path)
        self._init_db()
        self._register_core_commands()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS users "
                         "(user_id INTEGER PRIMARY KEY, username TEXT, "
                         "first_seen TEXT)")
            conn.execute("CREATE TABLE IF NOT EXISTS state "
                         "(user_id INTEGER PRIMARY KEY, state TEXT)")

    def remember_user(self, user):
        if not user:
            return
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR IGNORE INTO users VALUES (?, ?, datetime('now'))",
                         (user.get("id"), user.get("username", "")))

    def is_admin(self, user_id):
        return user_id in self.admin_ids

    def is_allowed(self, user_id):
        return not self.allowed_ids or user_id in self.allowed_ids

    # -- Bot API calls (raw HTTP, no heavy framework) -------------------
    def api_call(self, method, payload):
        resp = requests.post(f"{self.api}/{method}", json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def send_message(self, chat_id, text, reply_markup=None):
        payload = {"chat_id": chat_id, "text": text}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        if self.api is None:
            print(f"[OUT -> chat {chat_id}] {text}")
            if reply_markup:
                print(f"      keyboard: {json.dumps(reply_markup)}")
            return {"ok": True, "simulated": True}
        return self.api_call("sendMessage", payload)

    def get_updates(self, offset=None, timeout=30):
        params = {"timeout": timeout}
        if offset:
            params["offset"] = offset
        resp = requests.get(f"{self.api}/getUpdates", params=params, timeout=timeout + 10)
        resp.raise_for_status()
        return resp.json().get("result", [])

    # -- Core commands ----------------------------------------------------
    def _register_core_commands(self):
        router = self.router

        @router.command("start")
        def start(ctx, update):
            """Say hello and show the menu."""
            kb = inline_keyboard([[("Help", "help"), ("About", "about")]])
            return ctx.reply("Hello! I'm a bot built on this framework. "
                             "Pick an option below or type /help.",
                             reply_markup=kb)

        @router.command("help")
        def help_cmd(ctx, update):
            """List every command."""
            return ctx.reply(self.router.help_text())

        @router.command("about")
        def about(ctx, update):
            """About this bot."""
            return ctx.reply("Built with the Telegram Bot Framework — router, "
                             "plugins, inline keyboards and an allow-list, "
                             "on the raw Bot API.")

        @router.command("echo")
        def echo(ctx, update):
            """Echo your words back: /echo hello there"""
            return ctx.reply(" ".join(ctx.args) if ctx.args else "Usage: /echo <text>")

        @router.command("stats", admin_only=True)
        def stats(ctx, update):
            """Admin only: how many users the bot has seen."""
            with sqlite3.connect(self.db_path) as conn:
                count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            return ctx.reply(f"Known users: {count}")

        @router.middleware
        def allow_list(ctx, update):
            user_id = ctx.user.get("id")
            if user_id is not None and not self.is_allowed(user_id):
                ctx.reply("Sorry, this bot is private.")
                return False
            self.remember_user(ctx.user)
            return True

    def load_plugins(self, plugins_dir=PLUGINS_DIR):
        """Stand-out feature: drop a .py file in plugins/ and it becomes a
        command — no registration code. Each plugin defines register(router)."""
        loaded = []
        if not Path(plugins_dir).exists():
            return loaded
        for path in sorted(Path(plugins_dir).glob("*.py")):
            if path.name.startswith("_"):
                continue
            spec = importlib.util.spec_from_file_location(path.stem, path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            if hasattr(module, "register"):
                module.register(self.router)
                loaded.append(path.stem)
        return loaded

    def handle_update(self, update):
        ctx = Context(self, update)
        if update.get("callback_query"):
            data = update["callback_query"].get("data", "")
            if data == "help":
                return ctx.reply(self.router.help_text())
            if data == "about":
                return ctx.reply("Built with the Telegram Bot Framework.")
            return ctx.reply(f"You pressed: {data}")
        return self.router.dispatch(ctx, update)

    def poll(self):
        print("Polling Telegram for updates (Ctrl+C to stop)...")
        offset = None
        try:
            while True:
                for update in self.get_updates(offset):
                    offset = update["update_id"] + 1
                    self.handle_update(update)
        except KeyboardInterrupt:
            print("\nStopped.")


def demo_updates():
    """Offline update simulation — no token, no network."""
    return [
        {"update_id": 1, "message": {"message_id": 1, "from": {"id": 111, "username": "demo_user"},
         "chat": {"id": 111}, "text": "/start"}},
        {"update_id": 2, "message": {"message_id": 2, "from": {"id": 111, "username": "demo_user"},
         "chat": {"id": 111}, "text": "/help"}},
        {"update_id": 3, "message": {"message_id": 3, "from": {"id": 111, "username": "demo_user"},
         "chat": {"id": 111}, "text": "/echo hello from the demo"}},
        {"update_id": 4, "message": {"message_id": 4, "from": {"id": 111, "username": "demo_user"},
         "chat": {"id": 111}, "text": "/ping"}},
        {"update_id": 5, "message": {"message_id": 5, "from": {"id": 111, "username": "demo_user"},
         "chat": {"id": 111}, "text": "/stats"}},
        {"update_id": 6, "callback_query": {"id": "cb1", "from": {"id": 111},
         "message": {"chat": {"id": 111}}, "data": "about"}},
        {"update_id": 7, "message": {"message_id": 7, "from": {"id": 999, "username": "stranger"},
         "chat": {"id": 999}, "text": "/start"}},
    ]


def run_demo():
    print("== DEMO: offline simulation (no token, no network) ==\n")
    bot = Bot(token=None, admin_ids={111}, allowed_ids={111})
    loaded = bot.load_plugins()
    print(f"Plugins loaded: {loaded or 'none yet — add files to src/plugins/'}")
    print(f"Commands: {sorted(bot.router.handlers)}\n")
    for update in demo_updates():
        text = (update.get("message") or {}).get("text") or             f"[button: {update.get('callback_query', {}).get('data')}]"
        print(f">>> incoming: {text}")
        bot.handle_update(update)
        print()
    print("Demo complete. Set TELEGRAM_BOT_TOKEN and run --poll for the real API.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="bot.py",
        description="Telegram bot framework: router, plugins, inline "
                    "keyboards, allow-list. Token from TELEGRAM_BOT_TOKEN.")
    parser.add_argument("--demo", action="store_true",
                        help="Simulate updates offline (no token needed).")
    parser.add_argument("--poll", action="store_true",
                        help="Long-poll the real Telegram API.")
    parser.add_argument("--admin", type=int, nargs="*", default=[],
                        help="Telegram user IDs with admin rights.")
    parser.add_argument("--allow", type=int, nargs="*", default=[],
                        help="If set, only these user IDs may use the bot.")
    args = parser.parse_args(argv)
    if args.demo:
        return run_demo()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if args.poll:
        if not token:
            print("Set TELEGRAM_BOT_TOKEN in the environment first.", file=sys.stderr)
            return 2
        bot = Bot(token, admin_ids=set(args.admin), allowed_ids=set(args.allow))
        print(f"Plugins loaded: {bot.load_plugins()}")
        bot.poll()
        return 0
    parser.error("Choose --demo or --poll (try --help).")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
