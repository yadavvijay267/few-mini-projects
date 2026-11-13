"""Tiny web UI for the resume writer (standard library only)."""
import argparse, json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from writer import enhance_bullet, ats_gap

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYWORDS = [ln.strip() for ln in open(os.path.join(BASE, "assets", "ats_keywords.txt")) if ln.strip()]
PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>AI Resume Writer</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem}
textarea{width:100%;height:90px}button{padding:.6rem 1.2rem}pre{white-space:pre-wrap;background:#f4f4f4;padding:1rem}</style></head>
<body><h1>AI Resume Writer</h1><p>Template mode (offline). Set GEMINI_API_KEY and use the CLI with --llm for LLM mode.</p>
<label>Job description</label><textarea id="job"></textarea>
<label>Your bullets (one per line)</label><textarea id="bullets"></textarea>
<label>Tone</label><select id="tone"><option>concise</option><option>detailed</option></select>
<button onclick="go()">Improve bullets</button>
<pre id="out"></pre>
<script>async function go(){const r=await fetch('/api/improve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:job.value,bullets:bullets.value.split('\n').filter(Boolean),tone:tone.value})});document.getElementById('out').textContent=JSON.stringify(await r.json(),null,2)}</script>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
        self.wfile.write(PAGE.encode())

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        improved = [enhance_bullet(b, data.get("tone", "concise")) for b in data["bullets"]]
        gap = ats_gap(data.get("job", ""), improved, KEYWORDS)
        body = json.dumps({"improved": improved, "ats": gap}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def main():
    p = argparse.ArgumentParser(description="Serve the AI Resume Writer web UI.")
    p.add_argument("--port", type=int, default=8000)
    args = p.parse_args()
    print(f"Serving http://localhost:{args.port} (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
