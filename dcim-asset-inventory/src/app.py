"""DCIM web app on the Python standard library only.
Usage: python3 src/app.py [--port 8000] [--host 127.0.0.1]"""
import argparse, json, os, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import store

HERE = os.path.dirname(os.path.abspath(__file__))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, ctype):
        data = open(path, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        p = urlparse(self.path)
        if p.path == "/":
            return self._send_file(os.path.join(HERE, "index.html"), "text/html")
        if p.path == "/api/assets":
            q = parse_qs(p.query)
            return self._json(store.search(store.load(), q.get("q", [""])[0], q.get("type", [""])[0],
                                           q.get("room", [""])[0], q.get("status", [""])[0]))
        if p.path == "/api/capacity":
            return self._json(store.capacity(store.load()))
        if p.path == "/api/alerts":
            return self._json(store.alerts(store.load()))
        if p.path == "/api/export.csv":
            body = store.to_csv(store.load()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self.send_header("Content-Disposition", "attachment; filename=inventory.csv")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if p.path.startswith("/api/label/"):
            asset_id = p.path.rsplit("/", 1)[1]
            svg = store.label_svg(asset_id).encode()
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(svg)))
            self.end_headers()
            return self.wfile.write(svg)
        self.send_error(404)

    def do_POST(self):
        p = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        if p.path == "/api/assets":
            asset = json.loads(body)
            assets = store.load()
            if any(a["id"] == asset.get("id") for a in assets):
                return self._json({"error": "id already exists"}, 400)
            errors = store.validate(asset, assets)
            if errors:
                return self._json({"errors": errors}, 400)
            assets.append(asset)
            store.save(assets)
            return self._json(asset, 201)
        if p.path == "/api/import.csv":
            try:
                imported = store.from_csv(body.decode())
            except Exception as e:
                return self._json({"error": str(e)}, 400)
            assets = store.load()
            ids = {a["id"] for a in assets}
            added = 0
            for a in imported:
                if a["id"] not in ids and not store.validate(a, assets):
                    assets.append(a); added += 1
            store.save(assets)
            return self._json({"imported": added})
        self.send_error(404)

    def do_PUT(self):
        p = urlparse(self.path)
        if p.path.startswith("/api/assets/"):
            asset_id = p.path.rsplit("/", 1)[1]
            asset = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            assets = store.load()
            for i, a in enumerate(assets):
                if a["id"] == asset_id:
                    merged = {**a, **asset, "id": asset_id}
                    errors = store.validate(merged, [x for x in assets if x["id"] != asset_id])
                    if errors:
                        return self._json({"errors": errors}, 400)
                    assets[i] = merged
                    store.save(assets)
                    return self._json(merged)
            return self._json({"error": "not found"}, 404)
        self.send_error(404)

    def do_DELETE(self):
        p = urlparse(self.path)
        if p.path.startswith("/api/assets/"):
            asset_id = p.path.rsplit("/", 1)[1]
            assets = [a for a in store.load() if a["id"] != asset_id]
            store.save(assets)
            return self._json({"deleted": asset_id})
        self.send_error(404)

def main():
    ap = argparse.ArgumentParser(description="Serve the DCIM asset inventory app.")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1")
    a = ap.parse_args()
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print(f"DCIM inventory at http://{a.host}:{a.port}")
    srv.serve_forever()

if __name__ == "__main__":
    main()
