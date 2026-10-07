.PHONY: install backend frontend seed seed-checkpoints test lint format check

install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd frontend && npm install

backend:
	cd backend && .venv/bin/uvicorn carecircle.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

seed:
	cd backend && .venv/bin/python scripts/seed.py --reset --checkpoints --refresh-profile

# Only the Week 1 / Day 45 learning-curve banks; the live bank (and anything logged) is kept.
seed-checkpoints:
	cd backend && .venv/bin/python scripts/seed.py --reset --checkpoints-only --refresh-profile

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
