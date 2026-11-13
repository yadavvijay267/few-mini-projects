"""Example plugin: /joke — a tiny conversation-free fun command."""
import random

JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are only 10 kinds of people: those who understand binary and those who don't.",
    "Why did the developer go broke? Because he used up all his cache.",
]


def register(router):
    @router.command("joke")
    def joke(ctx, update):
        """Hear a programming joke: /joke"""
        return ctx.reply(random.choice(JOKES))
