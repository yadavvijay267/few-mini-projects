"""Tests for bot.py — the router, plugins and allow-list run offline."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import bot as botmod


def make_bot(tmp_path, **kwargs):
    kwargs.setdefault("admin_ids", {1})
    kwargs.setdefault("allowed_ids", set())
    return botmod.Bot(token=None, db_path=tmp_path / "test.db", **kwargs)


def update(user_id, text, username="tester"):
    return {"update_id": 1, "message": {"message_id": 1,
            "from": {"id": user_id, "username": username},
            "chat": {"id": user_id}, "text": text}}


def test_help_text_lists_commands_from_docstrings(tmp_path):
    b = make_bot(tmp_path)
    b.load_plugins()
    help_text = b.router.help_text()
    assert "/start" in help_text and "/help" in help_text and "/ping" in help_text
    assert "Say hello" in help_text


def test_plugin_auto_discovery(tmp_path):
    b = make_bot(tmp_path)
    loaded = b.load_plugins()
    assert "ping" in loaded and "joke" in loaded
    assert "ping" in b.router.handlers and "joke" in b.router.handlers


def test_echo_and_unknown_command(tmp_path, capsys):
    b = make_bot(tmp_path)
    b.handle_update(update(1, "/echo hello world"))
    assert "hello world" in capsys.readouterr().out
    b.handle_update(update(1, "/nope"))
    assert "Unknown command" in capsys.readouterr().out


def test_admin_only_command_blocked_for_regular_users(tmp_path, capsys):
    b = make_bot(tmp_path)
    b.handle_update(update(2, "/stats"))
    assert "admin-only" in capsys.readouterr().out
    b.handle_update(update(1, "/stats"))
    assert "Known users" in capsys.readouterr().out


def test_allow_list_blocks_strangers(tmp_path, capsys):
    b = botmod.Bot(token=None, admin_ids={1}, allowed_ids={1},
                   db_path=tmp_path / "test.db")
    b.handle_update(update(999, "/start"))
    assert "private" in capsys.readouterr().out


def test_inline_keyboard_shape():
    kb = botmod.inline_keyboard([[("Help", "help"), ("About", "about")]])
    assert kb["inline_keyboard"][0][0] == {"text": "Help", "callback_data": "help"}


def test_callback_query_handled(tmp_path, capsys):
    b = make_bot(tmp_path)
    b.handle_update({"update_id": 9, "callback_query": {"id": "cb",
                     "from": {"id": 1}, "message": {"chat": {"id": 1}},
                     "data": "about"}})
    assert "Telegram Bot Framework" in capsys.readouterr().out
