.PHONY: install backend frontend seed seed-week1 test lint format check

install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd frontend && npm install

backend:
	cd backend && .venv/bin/uvicorn carecircle.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

seed:
	cd backend && .venv/bin/python scripts/seed.py --reset --refresh-profile

seed-week1:
	cd backend && .venv/bin/python scripts/seed.py --reset --until 2026-07-08 --bank carecircle-sharma-week1

test:
	cd backend && .venv/bin/pytest -q

lint:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy
	cd frontend && npm run lint && npm run format:check

format:
	cd backend && .venv/bin/ruff check --fix . && .venv/bin/ruff format .
	cd frontend && npm run format

check: lint test
	cd frontend && npm run build
