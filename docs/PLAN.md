# CareCircle — Implementation Plan

> **One-liner:** CareCircle is a shared memory for families caring for an elderly parent. Every sibling, nurse and doctor visit feeds one memory — and the agent connects dots across weeks that no single person could.

---

## 1. Problem

Caring for an aging parent is fragmented:

- Siblings split duties across cities (or countries). Nobody holds the full picture.
- Home nurses, GPs and specialists each see a slice. Every doctor visit starts with *"So, when did this start?"* — and the family guesses.
- Critical history gets lost: *"Which antibiotic gave Dad a rash in 2024?"*
- Side effects of medication changes go unnoticed because the symptom appears days later and is reported by a different person.

**Cost of forgetting:** wrong-drug reactions, missed follow-ups, preventable falls, re-admissions, and exhausted caregivers repeating the same story.

## 2. Solution

A care-coordination agent built on **Hindsight** memory:

1. **Anyone logs anything** in plain language ("Dad felt dizzy getting up, BP 108/64"). The agent structures it and stores it as memory.
2. **Ask anything** ("When did the dizziness start?") — answered from memory, with dates and who reported it.
3. **Pattern alerts** — every new entry is checked against the history ("dizziness began 3 days after Metoprolol was increased").
4. **Doctor Visit Brief** — one page, tailored to the specialist, generated from everything since the last visit.
5. **Family catch-up** — "What happened since I last checked?" for the sibling living abroad.
6. **Care Profile that learns** — medications, allergies, routines and Dad's preferences, kept up to date automatically.

**Safety principle:** CareCircle *coordinates and remembers*; it never diagnoses or changes medication. It always routes decisions to the doctor, and escalates emergencies deterministically (not via LLM).

## 3. Stakeholders

| Type | Who | What they get |
|---|---|---|
| Primary users | Family caregivers (Priya — daughter, local; Arjun — son, abroad) | One shared memory, no more "what did the doctor say?" calls |
| Beneficiary | Patient (Ramesh Sharma, 74) | Safer care, fewer repeated questions, preferences respected |
| Secondary users | Home nurse (Lakshmi), doctors (GP, cardiologist) | Accurate history in 60 seconds |
| Buyers | Families (subscription), home-care agencies, eldercare startups, hospital home-care programs | Differentiated service, fewer escalations |
| Partners | Pharmacies, diagnostic labs, health insurers | Fewer adverse events and re-admissions |

## 4. Judging-criteria mapping

| Criterion (weight) | How CareCircle scores |
|---|---|
| Innovation (30%) | Not on the suggested list; multi-author shared memory for a *third person* (the patient) — beyond a chatbot |
| Hindsight Memory (25%) | Memory *is* the product: retain / recall / reflect / observations / mental models / directives / tags / temporal recall all used. Live Memory ON/OFF toggle |
| Technical (20%) | Clean FastAPI service layer, typed schemas, LLM retries + JSON repair + raw-note fallback, deterministic safety layer, tests, CI |
| UX (15%) | Single-page app: Log · Ask · Brief · Timeline · Care Profile. 60-second story demo |
| Real-world impact (10%) | Every judge has aging parents; clear B2B path via home-care agencies |

## 5. How Hindsight is used (the heart of the submission)

| Hindsight feature | CareCircle usage |
|---|---|
| **Memory bank** | One bank per care circle (`carecircle-sharma`). Configured with `retain_mission`, `reflect_mission`, `background` |
| **retain** | Every log entry → memory with real `timestamp`, `context` (who/what), `tags` (`patient:ramesh`, `type:medication`, `author:priya`), `metadata`, `entities` |
| **recall** | Timeline search, "since last visit" (`temporal_window`), type-filtered lookups (e.g. all `type:reaction`) |
| **reflect** | Ask answers, pattern alerts, doctor brief (with `response_schema` → structured JSON), `include_facts` → citations |
| **Observations** | Hindsight auto-consolidates repeated facts ("evening sugar high on festival days") — shown as "Learned patterns" |
| **Mental models** | "Care Profile" (meds, allergies, routines, preferences) auto-refreshes after consolidation → visible learning |
| **Directives** | Hard rules for reflect: never diagnose, cite dates + reporter, emergency → call 112 |
| **Tags** | Multi-patient support (Mom *and* Dad in one circle), filtered by `patient:*` |

### Memory ON vs OFF (demo centerpiece)
The Ask screen has a toggle. **OFF** = same LLM, no memory → generic advice. **ON** = Hindsight reflect over the family's history → specific, dated, cited answer.

## 6. Architecture

```
┌──────────────────────────── React (frontend/) ────────────────────────────┐
│  Log  │  Ask (Memory ON/OFF)  │  Doctor Brief  │  Timeline  │  Care Profile │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ JSON / REST
┌───────────────────────────── FastAPI (backend/) ────────────────────────────────┐
│  safety.py    deterministic emergency detection (runs before any LLM)       │
│  agents/extractor.py  NL note → CareEvent (Groq, JSON)                      │
│  agents/alerts.py     new event vs history → alerts (Hindsight reflect)     │
│  agents/ask.py        Q&A: memory ON → Hindsight reflect (+ citations),     │
│                       memory OFF → plain Groq (baseline for comparison)     │
│  agents/brief.py      doctor visit brief (reflect + response_schema)        │
│  memory.py            the ONLY module that talks to Hindsight               │
│  llm.py               Groq client w/ retries + JSON repair                   │
└──────────────┬──────────────────────────────────────────────┬───────────────┘
               │                                              │
        Hindsight (Cloud or local)                     Groq (gpt-oss-120b)
```

Tech: Python 3.11+, FastAPI, `hindsight-client`, `groq`, Pydantic v2 (ruff, mypy, pytest) · React 19 + TypeScript + Vite + Tailwind v4 (oxlint, Prettier) · GitHub Actions CI.

### Repository layout

```
.github/        workflows/ci.yml, PR + issue templates
backend/        pyproject.toml, src/carecircle/{api,agents,memory.py,llm.py,safety.py}, tests/, scripts/seed.py, data/
frontend/       src/{api,components,features,lib}, vite.config.ts
docs/           PLAN.md, HINDSIGHT.md
Makefile        install · seed · backend · frontend · check
```

## 7. Features & scope

### MVP (must ship)
- [x] F1 **Care Log** — free-text entry → structured event → retain. Author selector (Priya / Arjun / Nurse Lakshmi).
- [x] F2 **Safety layer** — emergency keywords (chest pain, stroke signs, unconscious, head injury after fall…) → red banner "Call 112 now" before anything else.
- [x] F3 **Pattern Alerts** — after each log, reflect over history → 0-3 alerts with related dates.
- [x] F4 **Ask CareCircle** — chat with Memory ON/OFF toggle, citations.
- [x] F5 **Doctor Visit Brief** — pick doctor/specialty + date of last visit → structured one-pager (changes, trends, med changes, pending follow-ups, questions to ask). Printable.
- [x] F6 **Timeline** — chronological memory list, filter by type.
- [x] F7 **Care Profile** — mental model panel ("What CareCircle has learned about Dad"), refresh button.
- [x] F8 **Seed script** — loads 90 days of realistic synthetic history; `--until` flag to show the learning curve (Day 7 → Day 45 → Day 90).

### Stretch
- [ ] Family catch-up digest per caregiver ("since you last checked")
- [ ] Voice note logging (Web Speech API)
- [ ] WhatsApp bot ingestion
- [ ] Multi-language (Hindi / Marathi replies)
- [ ] Export brief as PDF

## 8. Synthetic data — "The Sharma family" (`backend/data/sharma_family.json`)

- **Patient:** Ramesh Sharma, 74, retired railway engineer, Pune. Type 2 diabetes, hypertension, knee osteoarthritis.
- **Circle:** Priya (daughter, Pune, primary), Arjun (son, Seattle), Lakshmi (home nurse, mornings), Dr. Anil Mehta (GP), Dr. Sunita Kulkarni (cardiologist).
- **Window:** 2026-07-01 → 2026-09-27 (+ one historical 2024 reaction).

Embedded story arcs (what memory must discover):

| Arc | Planted facts | What the agent should surface |
|---|---|---|
| A. Dose change → dizziness | Metoprolol 25→50 mg on Aug 10; dizziness from Aug 13; HR 52-56; fall on Aug 22 | "Dizziness started 3 days after the dose increase; reported by 3 different people" |
| B. Past drug reaction | Rash + itching after Co-trimoxazole (Bactrim) in Mar 2024 | Live demo: GP suggests Bactrim → instant alert |
| C. Missed follow-up | Cardiologist asked for lipid profile in 6 weeks (Jul 20) — never done | Brief lists it under "Pending" |
| D. Sugar pattern | High evening sugar on festival/sweets days, lower on walk days | Observation: "evening sugar rises after sweets; walks help" |
| E. Preferences | Refuses crushed pills; calmer if told about hospital visits the night before; prefers Marathi; hates morning appointments | Care Profile + brief "notes for the visit" |

## 9. Demo script (3 minutes)

1. **Hook (15 s):** "My friend's father fell last month. Four people had seen the warning signs — none of them knew the others had."
2. **Memory OFF (20 s):** Ask *"Dad has been dizzy again this morning. What should I tell the cardiologist?"* → generic list.
3. **Memory ON (40 s):** Same question → "Dizziness started Aug 13, 3 days after Metoprolol went 25→50 mg (Dr. Kulkarni, Aug 10). Nurse Lakshmi recorded HR 52-56 on 4 mornings. Fall on Aug 22. Lipid profile requested Jul 20 is still pending." — with citations.
4. **Live learning (40 s):** Priya logs *"Dr. Mehta wants to start Bactrim for a urine infection."* → ⚠️ alert: "Mar 2024: rash after Co-trimoxazole (Bactrim). Tell Dr. Mehta before starting."
5. **Doctor Brief (30 s):** Generate cardiology brief for Sep 30 → print-ready page.
6. **Learning curve (20 s):** Care Profile after Day 7 vs Day 90 (seeded with `--until`).
7. **Close (15 s):** Stakeholders + business model.

## 10. Build timeline

| Phase | Deliverable |
|---|---|
| 0. Setup | Repo, `.env`, Hindsight Cloud account (promo `MEMHACK99`), Groq key |
| 1. Memory layer | `memory.py`: bank setup, directives, mental model, retain/recall/reflect wrappers |
| 2. Data | `data/sharma_family.json` + `scripts/seed.py` |
| 3. Agents | extractor, alerts, ask (tool-calling + fallback), brief |
| 4. API | FastAPI routes + safety layer |
| 5. UI | Single-page app, 5 tabs, Memory toggle |
| 6. Hardening | Tests, error states, loading states, rate-limit handling |
| 7. Submission | README, architecture diagram, demo video, article, social post |

## 11. API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/circle` | Patient, caregivers, doctors (static config) |
| POST | `/api/log` | `{text, author, patient_id, occurred_at?}` → event + alerts + safety |
| POST | `/api/ask` | `{question, patient_id, use_memory}` → answer + sources |
| POST | `/api/brief` | `{patient_id, doctor_id, since}` → structured brief |
| GET | `/api/timeline` | `?patient_id&type&q` → memories |
| GET | `/api/profile` | `?patient_id` → Care Profile mental model |
| POST | `/api/profile/refresh` | refresh mental model |

## 12. Edge cases handled

- LLM returns malformed JSON / tool-call errors → retry, JSON repair, fallback to direct reflect.
- Hindsight 429/503 → SDK retry for recall/reflect; friendly UI error for retain.
- Empty memory (new circle) → Ask/Brief explain there's not enough history yet.
- Emergency text → deterministic banner, logged with `type:emergency` tag, not blocked on LLM.
- Relative dates ("yesterday evening") → resolved by extractor against the entry time.
- Multiple patients → strict `patient:*` tag filtering.

## 13. Submission checklist

- [ ] GitHub repo with clean README + architecture + "How Hindsight is used"
- [ ] Demo video (3 min, script above)
- [ ] Live demo rehearsed with seeded bank
- [ ] Article, social post, video per content guide (each team member)
- [ ] Responsible-AI note: no diagnosis, data privacy, consent of patient
