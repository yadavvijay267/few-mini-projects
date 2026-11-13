"""Example plugin: /ping — proves the plugin system works.

Drop a file like this into src/plugins/ and it is auto-discovered on the
next start. No registration code anywhere else.
"""


def register(router):
    @router.command("ping")
    def ping(ctx, update):
        """Check the bot is alive: /ping"""
        return ctx.reply("Pong! The bot is alive.")
