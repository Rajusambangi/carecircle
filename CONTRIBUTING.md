# Contributing

## Setup

```bash
make install          # backend venv + frontend node_modules
cp backend/.env.example backend/.env   # add Hindsight + Groq keys
make seed             # load the Sharma family history into Hindsight
make backend          # http://localhost:8000  (API docs at /docs)
make frontend         # http://localhost:5173
```

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat: add doctor brief print view`.
3. Run `make check` before pushing. CI runs the same checks.
4. Open a PR using the template; at least one teammate reviews.

## Coding standards

### Backend (Python 3.11+)

- **Format / lint:** `ruff format` + `ruff check` (config in `backend/pyproject.toml`, line length 100).
- **Types:** `mypy` must pass. Annotate all public functions.
- **Layout:**
  - `memory.py` is the only module that imports `hindsight_client`.
  - `llm.py` is the only module that imports `groq`.
  - `agents/` holds one use case per file and depends on the `MemoryStore` protocol, not the concrete class.
  - `api/routes.py` does HTTP only: validation, error mapping, no prompts.
- **Tests:** `pytest` with fakes from `tests/conftest.py`. Never call real Hindsight or Groq in tests.
- **Safety:** prompts must never diagnose or tell the family to change medication. Emergency detection stays deterministic (`safety.py`).

### Frontend (TypeScript + React)

- **Format / lint:** Prettier (`.prettierrc`) + oxlint. `npm run lint && npm run format:check`.
- **Types:** `strict` TypeScript. Keep `src/types.ts` in sync with `backend/src/carecircle/schemas.py`.
- **Layout:** `api/` for HTTP calls, `components/` for reusable UI, `features/` for one panel each, `lib/` for helpers.
- **Styling:** Tailwind utility classes only. Brand colours are defined in `src/index.css` (`@theme`).
