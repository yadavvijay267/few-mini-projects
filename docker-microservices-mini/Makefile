up:
	docker compose up --build -d
down:
	docker compose down
test:
	python3 -m pytest tests/ -q
logs:
	docker compose logs -f
seed:
	curl -s -X POST localhost:8000/tasks -H 'Content-Type: application/json' -d '{"title":"Seed task"}'
