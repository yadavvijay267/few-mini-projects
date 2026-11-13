import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "worker"))
import app as api_app
import worker as worker_mod

BASE = os.path.join(os.path.dirname(__file__), "..")


def test_create_and_list_tasks():
    api_app.TASKS.clear()
    api_app.NEXT_ID[0] = 1
    t = api_app.create_task("Write docs")
    assert t["id"] == 1 and t["status"] == "queued"
    assert len(api_app.list_tasks()) == 1


def test_worker_marks_queued_done():
    task = {"id": 1, "title": "x", "status": "queued"}
    assert worker_mod.process(task)["status"] == "done"


def test_compose_defines_all_services():
    text = open(os.path.join(BASE, "docker-compose.yml")).read()
    for svc in ("api:", "worker:", "frontend:", "nginx:", "db:", "cache:"):
        assert svc in text
    assert "healthcheck" in text and "restart: unless-stopped" in text


def test_makefile_has_three_commands():
    text = open(os.path.join(BASE, "Makefile")).read()
    for cmd in ("up:", "test:", "logs:"):
        assert cmd in text


def test_nginx_proxies_api_and_frontend():
    text = open(os.path.join(BASE, "src", "nginx", "nginx.conf")).read()
    assert "proxy_pass http://api:8000" in text
    assert "proxy_pass http://frontend:80" in text
