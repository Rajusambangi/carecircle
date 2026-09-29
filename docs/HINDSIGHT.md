# How CareCircle uses Hindsight

CareCircle has no database of its own. Everything the circle knows lives in a Hindsight memory bank. All calls go through [`backend/src/carecircle/memory.py`](../backend/src/carecircle/memory.py).

## 1. Bank setup (`HindsightMemory.setup`)

There is one bank per care circle (`carecircle-sharma`). It is created with:

| Setting | Purpose |
|---|---|
| `retain_mission` | Tells extraction what matters in care notes: exact vitals, drug names, doses and **dose changes**, reactions, falls, doctor instructions, preferences, and **who reported each fact** |
| `observations_mission` | Tells consolidation which patterns to form: symptoms after a medication change, vital-sign trends, lifestyle effects on blood sugar, overdue follow-ups, stable preferences |
| `reflect_mission` | CareCircle's role: connect facts across time and people, cite evidence, never diagnose |
| `background` | Patient, conditions, caregivers and doctors, so that "Dr. K" or "Uncle" resolve to the right person |
| **Directives** | `no-diagnosis` (priority 100), `emergencies-first` (90), `cite-evidence` (80). These are enforced on every reflect call |
| **Mental model** `care-profile-<patient>` | A living care profile. `refresh_after_consolidation: true` keeps it current |

## 2. Writing memory (`retain_events`)

Each log entry becomes one `retain` item:

```python
{
  "content":  "Thu 13 Aug 2026, 08:20 — Lakshmi Nair (home nurse, visits every morning) logged about Ramesh Sharma: Uncle felt dizzy ... BP 118/72, pulse 58.",
  "timestamp": occurred_at,                        # event time, not upload time (for temporal reasoning)
  "context":  "care log · symptom · severity medium · by Lakshmi Nair (...)",
  "tags":     ["patient:ramesh", "type:symptom", "author:lakshmi"],
  "metadata": {"type": "symptom", "severity": "medium", "author_id": "lakshmi", "original_text": "..."},
  "entities": [{"text": "dizziness"}],
}
```

Two details matter here:

- The **real event timestamp** lets Hindsight answer "since the last visit" and order events such as "three days after the dose change".
- The **reporter is included in the text itself**. This is what allows answers like *"reported by three different people"*, which is the core value of a *shared* memory.

## 3. Reading memory

| Feature | Hindsight call | Notes |
|---|---|---|
| Ask (memory ON) | `reflect(query, tags=[patient], include_facts=True)` | Answer text plus the facts used, shown as citations |
| Ask (memory OFF) | none; plain Groq call | The baseline for the before/after comparison |
| Pattern alerts | `reflect(..., response_schema=ALERTS_SCHEMA)` | Returns typed alerts `{title, detail, severity, related_dates}`. Runs in parallel with retain, so it checks against the history *before* this entry |
| Doctor brief | `reflect(..., response_schema=BRIEF_SCHEMA, budget="high")` | Structured one-pager. Falls back to markdown if parsing fails |
| Timeline | `list_memories(search_query=...)` | Filtered by the patient tag |
| Care profile | `get_mental_model(detail="content")` + `list_memories(type="observation")` | The profile plus the consolidated patterns |

## 4. Why this gets better over time

1. **Week 1**: a few vitals and a preference. The profile is thin, and alerts have nothing to connect to.
2. **Week 6**: a dose change, then dizziness reported by the nurse, a son and a daughter. Observations consolidate *"dizziness since the Metoprolol increase"*.
3. **Week 12**: the profile knows the medicines, the 2024 sulfa reaction, the overdue lipid test, the preference for afternoon appointments and Marathi explanations. New entries now trigger specific, dated alerts.

To show this in the demo, seed two banks: `make seed-week1` and `make seed`.
