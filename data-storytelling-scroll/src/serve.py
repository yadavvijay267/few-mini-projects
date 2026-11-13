"""Serve the storytelling page locally (standard library only)."""
import argparse, functools, http.server, os

def main():
    parser = argparse.ArgumentParser(description="Serve the data storytelling page.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    directory = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
    print(f"Serving http://localhost:{args.port}/index.html (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()

if __name__ == "__main__":
    main()
