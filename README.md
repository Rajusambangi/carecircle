# ◎ CareCircle

**Shared memory for families caring for an elderly parent.** Built on [Hindsight](https://hindsight.vectorize.io).

> Four people saw the warning signs before Dad fell. None of them knew the others had.

Caring for an aging parent is split across siblings in different cities, a home nurse, a GP and specialists. Each of them sees one slice. CareCircle gives the whole circle **one memory**. Anyone can log what they notice in plain language, and the agent connects the dots across weeks: *"The dizziness started 3 days after the Metoprolol dose was doubled, and it's been reported by three different people."*

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

---

## What it does

| | Feature | Why memory matters |
|---|---|---|
| ✍️ | **Care Log**: anyone logs a note like "Dad dizzy after bath, BP 112/70" | Every note becomes a dated memory with the reporter attached |
| ⚠️ | **Pattern alerts** on every new entry | *"Mar 2024: rash after Bactrim. Tell Dr. Mehta before starting it."* |
| 💬 | **Ask CareCircle**, shown side by side with a **no-memory** assistant | Generic advice vs. an answer with specific dates and sources |
| 📋 | **Doctor visit brief**: a printable one-pager tailored to the specialist | Everything since the last visit, including dose changes and overdue tests |
| 🧠 | **Care profile** that updates itself | Medications, allergies, routines and Dad's preferences, learned over time |
| 🗓 | **Timeline** of everything the circle has recorded | Searchable history in one place |
| 🚨 | **Deterministic emergency check** | Red-flag words trigger "Call 112", without waiting on an LLM |

CareCircle **coordinates and remembers. It never diagnoses** or tells the family to change a medication.

## How Hindsight is used

Memory is the product. See [docs/HINDSIGHT.md](docs/HINDSIGHT.md) for full details.

- **Bank per care circle**, configured with a `retain_mission`, `observations_mission`, `reflect_mission` and `background`.
- **`retain`**: each log entry is stored with its real event `timestamp`, the reporter in `context`, and tags `patient:*`, `type:*`, `author:*`.
- **`reflect`**: powers Ask, pattern alerts (`response_schema` → typed alerts) and the doctor brief (`response_schema` → structured one-pager). `include_facts` provides the citations.
- **Observations**: Hindsight consolidates repeated facts into patterns, shown as "Patterns noticed".
- **Mental model**: the "Care profile" is refreshed after each consolidation, so you can watch it learn.
- **Directives**: hard rules: no diagnosis, emergencies first, cite date and reporter.
- **Tags**: `patient:<id>` keeps several patients (Mom *and* Dad) separate within one circle.

## Architecture

```
frontend/  React + TypeScript + Vite + Tailwind
   │  /api (Vite proxy)
backend/   FastAPI
   ├── api/routes.py     HTTP only
   ├── safety.py         deterministic emergency detection
   ├── agents/
   │   ├── extractor.py  note → structured CareEvent   (Groq)
   │   ├── alerts.py     new event vs history          (Hindsight reflect + schema)
   │   ├── ask.py        Q&A, memory on/off            (Hindsight reflect | Groq)
   │   └── brief.py      doctor visit brief            (Hindsight reflect + schema)
   ├── memory.py         the ONLY Hindsight client
   └── llm.py            the ONLY LLM client: Groq → local Ollama fallback (retries + JSON repair)
```

## Quick start

**Prerequisites:** Python 3.11+, Node 20+, a [Hindsight Cloud](https://ui.hindsight.vectorize.io) API key (promo `MEMHACK99`) or a local Hindsight instance, and a [Groq](https://console.groq.com/keys) API key. Optionally, [Ollama](https://ollama.com) with `ollama pull llama3.2` as a local fallback: if Groq is missing, rate-limited or down, CareCircle uses the local model automatically.

```bash
make install
cp backend/.env.example backend/.env     # fill in HINDSIGHT_* and GROQ_API_KEY
make seed                                # loads 90 days of the Sharma family's history
make backend                             # terminal 1 → http://localhost:8000/docs
make frontend                            # terminal 2 → http://localhost:5173
```

`make check` runs lint, type checks, tests and the frontend build (the same checks as CI).

## Demo (3 minutes)

The demo data is **the Sharma family** ([backend/data/sharma_family.json](backend/data/sharma_family.json)): Ramesh (74, diabetes and hypertension); his daughter Priya in Pune; his son Arjun in Seattle; nurse Lakshmi; Dr. Mehta (GP); and Dr. Kulkarni (cardiologist). The data covers 90 days with five planted story arcs.

1. **Ask**: *"Dad has been dizzy again this morning. What should I tell the cardiologist?"* The no-memory answer is generic. CareCircle links the dizziness to the Aug 10 Metoprolol increase, the low pulse readings, the Aug 22 fall, and the lipid test that is still pending.
2. **Log** (as Priya): *"Dr. Mehta wants to start Bactrim DS for 5 days."* An ⚠️ alert fires about the March 2024 rash.
3. **Doctor brief** for Dr. Kulkarni, Sep 30: a one-page brief, ready to print.
4. **Care profile**: compare the `week1` bank (`make seed-week1`) with the full bank to show the learning curve.

## Repository layout

```
.github/            CI workflow, PR and issue templates
backend/            FastAPI service (src/carecircle), tests, seed script, demo data
frontend/           React app (src/api, src/components, src/features, src/lib)
docs/               PLAN.md (product and build plan), HINDSIGHT.md (memory design)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and coding standards.

## Responsible AI

- No diagnosis and no medication instructions. This is enforced through Hindsight directives and the prompts.
- Emergency detection is rule-based and runs before any model call.
- All demo data is synthetic. A real deployment would need the patient's consent, encryption at rest, and access limited to the care circle.

## License

[MIT](LICENSE)
