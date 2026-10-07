# Four People Saw the Warning Signs. Hindsight Connected Them.

A 74-year-old man falls in his bathroom at 6:30 in the morning. Afterwards, the family pieces it together: the home nurse had logged a pulse of 52 and a dizzy spell on standing. His son, on a video call from Seattle, heard that "the room spun a little." His daughter noticed he was napping three hours a day. And three days before the first dizzy spell, the cardiologist had doubled one of his heart medicines.

Four people each held one piece of the story. Nobody held the whole thing.

I built CareCircle to be the one who does. It's a shared memory for everyone caring for an elderly parent — siblings, the home nurse, notes from doctor visits — and an agent that connects what they each record across weeks. The memory layer is [Hindsight](https://github.com/vectorize-io/hindsight), and most of what's interesting about this project is how much of the "connect the dots" behaviour comes from how you write to and read from that memory, not from prompt engineering.

## What it does

Anyone in the circle logs what they notice in plain language: "Dad felt dizzy getting up, BP 118/72, pulse 58." A small LLM call structures it (type, severity, entities, and the time it actually happened), and it goes into a Hindsight memory bank — one bank per family.

From that one memory, the app offers:

- **Ask** — questions answered from the family's history, with every claim dated and attributed.
- **Pattern alerts** — every new entry is checked against everything before it.
- **Doctor visit brief** — a one-page summary for a specific specialist, since the last visit.
- **Catch-up** — "since you last checked" for the sibling who lives abroad.
- **Care profile** — a living summary of medicines, reactions, routines and preferences.

The stack is deliberately boring: FastAPI, a React frontend, Groq for the small extraction calls (with a local Ollama model as fallback), and Hindsight for everything that needs to be remembered or reasoned over. One rule I held to: `memory.py` is the only module that imports the Hindsight client. Every feature goes through it.

[Screenshot: the Ask screen — "without memory" vs CareCircle side by side]

## The core problem: shared memory is a different beast

Most agent-memory examples have one user talking to one agent. CareCircle has four people writing about a *fifth* person who never touches the app. That changes what a "memory" needs to carry.

It needs **when it happened**, not when it was uploaded. A nurse's 8 a.m. reading, entered at lunchtime, is still an 8 a.m. reading.

It needs **who said it**. "Dizziness was reported by three different people" is the single most useful sentence the agent produces, and it's impossible if memories are anonymous.

And it needs to keep **one person's history apart from another's**, because many families are caring for both parents.

Here is the write path. Each log entry becomes one retain item:

```python
items.append({
    "content": content,                 # the note, with reporter and event date in the text
    "timestamp": e.occurred_at,         # when it happened, not when it was typed
    "context": context,                 # "care log · symptom · severity medium · by Lakshmi Nair (home nurse)"
    "tags": [patient_tag(e.patient_id), f"type:{e.type}", f"author:{e.author_id}"],
    "metadata": {"type": e.type, "severity": e.severity, "author_id": e.author_id},
    "document_id": document_id(e),      # lets us read back exactly what was learned
})
await self.client.aretain_batch(self.bank_id, items)
```

The bank itself is created with a `retain_mission` that tells Hindsight what matters in care notes — exact vitals, drug names, every dose change, falls, doctor instructions, and who reported each fact — and an `observations_mission` that tells it which patterns to consolidate: symptoms that began after a medication change, overdue follow-ups, stable preferences. I spent more time on those two paragraphs of English than on any single function.

## Reading: reflect does the connecting

The read side is almost entirely Hindsight's `reflect`. When someone asks a question, I don't retrieve chunks and stuff them into a prompt; I ask the bank to reason over its own memory, scoped to one patient by tag, and to hand back the facts it used:

```python
resp = await self.client.areflect(
    self.bank_id, question,
    tags=[patient_tag(patient_id)],
    include_facts=True,            # every answer comes with the memories behind it
    response_schema=schema,        # typed output for alerts, briefs and catch-ups
)
```

That `response_schema` is what makes the pattern alerts reliable. When Priya (the daughter) logs *"Dr. Mehta wants to start Bactrim DS for five days,"* the alert check is a `reflect` call that must return `{title, detail, severity, related_dates}`. It comes back with an urgent alert: in March 2024, Bactrim caused a rash and the GP said to avoid sulfa antibiotics. Nobody mentioned it this time. It was just in memory.

Safety rules live in Hindsight **directives** rather than in each prompt: never diagnose, never tell the family to change a dose, put emergencies first, cite the date and reporter for every claim. They apply to every `reflect` call, including ones I add later and forget to guard. Emergency detection itself ("chest pain", "unresponsive", "hit his head") is plain regex that runs before any model call. That's one part I refused to hand to an LLM.

[Screenshot: an urgent alert sliding in after logging the Bactrim note]

## The bug that taught me the most

Early on, I asked: *"Dad has been dizzy again this morning. What should I tell the cardiologist?"* The answer was excellent — except it said the fall happened on **August 26, reported by Arjun**.

The fall was on August 22, logged by Priya. On August 26, Arjun had written in the family group: *"Did anyone tell Dr. Kulkarni about the fall?"* Hindsight had extracted a "fall" fact from Arjun's message and dated it to his message.

In a notes app, that's a typo. In a caregiving app, a shifted date can change what a doctor concludes. I fixed it in three layers:

1. **The data.** People reference earlier events all the time. The note now reads "Dad's fall on 22 August", which is also how people actually write.
2. **The memory.** Each entry now states explicitly: *"Events in this entry happened on {date} unless another date is stated."*
3. **A directive**, because this will happen again with other events:

```python
("date-precision",
 "Every event keeps its own date: the day it happened, as written in the entry that "
 "first recorded it. A later message that mentions an earlier event does not change when "
 "that event happened. Never attribute an event to the date or author of a later message.")
```

Then I added a check I should have had from day one. Every date an answer mentions is compared against the dates and text of the memories `reflect` actually used. If a date has no support, the answer carries a visible warning. It's simple regex over month-day pairs, but it turns "trust me" into "here's what I checked."

## Proving that it learns

The claim "the agent gets better over time" is easy to make and hard to show. So I made it literal. The seed script builds **checkpoint banks** — the same family's history cut off at Week 1, Day 45 and today — and the Ask screen can send one question to all of them at once:

```python
CHECKPOINTS = [
    CheckpointDef("week1", "Week 1", date(2026, 7, 8), "A few vitals and first preferences"),
    CheckpointDef("day45", "Day 45", date(2026, 8, 14), "Dose change and first dizzy spells"),
    CheckpointDef("today", "Today", None, "90 days, 4 people, every entry"),
]
```

Asked the dizziness question, the four answers read like a progression:

- **No memory:** reasonable, generic advice that could apply to anyone.
- **Week 1:** knows his medicines and that he hates pills hidden in food; nothing about dizziness.
- **Day 45:** has just seen the Metoprolol increase on August 10 and the first dizzy spells on the 13th and 14th.
- **Today:** dizziness started three days after the dose was doubled, reported by the nurse, the son and the daughter; resting pulse in the low 50s; a fall on August 22; and the lipid test the cardiologist asked for in July still hasn't been done.

Same model, same prompt. The only variable is what's in memory. For me, that screen explains [what agent memory is](https://vectorize.io/what-is-agent-memory) better than any diagram.

[Screenshot: the learning-curve view — four columns from "no memory" to "today"]

## Making memory visible

Two small features did more for trust than anything else.

After every log entry, the app shows **"What CareCircle just learned"**: the facts Hindsight extracted from that one note, and the medicines and people it recognised. Because every entry is retained with its own `document_id`, I can recall and filter to exactly those facts. People stop wondering whether the AI "got it."

And every answer's sources show the **reporter**. The `context` string I store at retain time ("… by Lakshmi Nair (home nurse)") comes back on each fact that `reflect` used. So a citation reads *"22 Aug · recorded by Priya Sharma · fall"*, not an opaque chunk ID.

## Lessons I'd reuse

1. **Store event time, not ingestion time.** Pass a real `timestamp` on retain. Temporal answers like "three days after the dose change" depend on it, and they're the answers people value most.
2. **Put provenance in the text, not only in metadata.** `reflect` reasons over what's written. If you want answers to say *who* reported something, the reporter has to be part of the memory itself.
3. **Write your missions like a spec.** `retain_mission` and `observations_mission` are the highest-leverage configuration in the project. Vague missions produce vague memories.
4. **Put invariants in directives.** Rules that must hold for every answer (no diagnosis, cite evidence, keep dates) belong in the bank, not scattered across prompts.
5. **Check the claims your agent makes.** A cheap, deterministic check of dates against the sources caught a bug that no prompt tweak would have made obvious.

The [Hindsight docs](https://hindsight.vectorize.io/) cover retain, recall, reflect, observations and mental models in more depth than I can here. What surprised me was how little glue code the "connect the dots" behaviour needed once the memory was written well. Most of my effort went into deciding *what* to remember and *how to say it* — which, for a family trying to keep a parent safe, is exactly the right problem to spend time on.
