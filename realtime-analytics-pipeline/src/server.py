"""Live dashboard server: SSE endpoint pushing window snapshots."""
import argparse, json, os, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pipeline import EventGenerator, StreamProcessor

BASE = os.path.dirname(os.path.abspath(__file__))
GENERATOR = EventGenerator()
PROCESSOR = StreamProcessor(dead_letter_path=os.path.join(BASE, "..", "dead_letter.jsonl"))


def _produce():
    while True:
        PROCESSOR.process(GENERATOR.next_event())
        time.sleep(0.2)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            try:
                while True:
                    payload = "data: " + json.dumps(PROCESSOR.snapshot()) + "\n\n"
                    self.wfile.write(payload.encode()); self.wfile.flush()
                    time.sleep(1)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        path = os.path.join(BASE, "dashboard.html")
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def main():
    parser = argparse.ArgumentParser(description="Serve the live analytics dashboard.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    threading.Thread(target=_produce, daemon=True).start()
    print(f"Live dashboard: http://localhost:{args.port} (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
