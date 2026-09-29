# CareCircle — Demo Script

Target: **4 minutes** for the finale (a 3-minute cut is marked ✂️). Every click and every line to say is below.

---

## Before you go on stage (T-30 min)

- [ ] `make seed` has finished (live bank **and** the Week 1 / Day 45 checkpoints).
- [ ] `make backend` and `make frontend` running; Ollama running (`ollama serve`) as LLM fallback.
- [ ] Open `http://localhost:5175` in **Chrome** (most reliable for voice), full screen, zoom 100%.
- [ ] Allow microphone permission once (click the mic, say anything, stop).
- [ ] **Warm-up:** ask each demo question once so Hindsight is warm, then click **New conversation**.
- [ ] Care profile tab → **Refresh** once, so the profile and patient card show medications.
- [ ] "I am" = **Priya (daughter)**. Ask mode = **vs no memory**.
- [ ] Backup: screen recording of this exact script, in case Wi-Fi fails.

---

## The script

### 1. Hook — 15 s
> "My friend's father fell in the bathroom last month. Afterwards we realised four different people had seen the warning signs — the nurse, his son, his daughter. None of them knew the others had. CareCircle is the shared memory that would have connected the dots."

### 2. Meet Ramesh — 15 s
**Click** the *Ramesh Sharma* card in the header.
> "This is Ramesh, 74, diabetic, hypertensive, living alone in Pune. His care circle: daughter Priya in Pune, son Arjun in Seattle, nurse Lakshmi every morning, and two doctors. Everything they notice goes into one Hindsight memory — 90 days of it."

Point at the **medications from memory** and the **memory count**. **Close.**

### 3. Memory vs no memory — 45 s  ⭐ the core moment
Ask tab, mode **vs no memory**. **Click** the suggestion:
**"Dad has been dizzy again this morning. What should I tell the cardiologist?"**

> "Same question, same AI. On the left, no memory — generic advice anyone could Google.
> On the right, CareCircle: the dizziness started **3 days after Dr. Kulkarni doubled his Metoprolol on Aug 10**. It was reported by **three different people** — Lakshmi, Arjun and Priya. There was a **fall on Aug 22**, and the **lipid test the cardiologist asked for in July is still not done**."

Point at the green badge **"All dates match the family's records"**, then **expand "Based on N memories"**:
> "And it's accountable: every date is fact-checked against the records, and every source shows who recorded it."

### 4. Watch it learn — 40 s  ⭐ the Hindsight moment
**Click** *New conversation* → **"Watch CareCircle learn"**.
> "Here's the same question asked of CareCircle's memory as it was on four different days.
> **No memory**: generic. **Week 1**: it knows his medicines, but nothing about dizziness yet. **Day 45**: it has just seen the dose change and the first dizzy spells. **Today**: it connects everything. That's not a better prompt — that's memory accumulating."

✂️ *3-minute cut: skip step 6 and step 9.*

### 5. Log by voice, and a live alert — 40 s
**Log** tab (I am Priya). **Click the mic** and say:
**"Dr. Mehta called with the urine culture result and wants to start Bactrim DS twice a day for five days."**
Stop the mic → **Save to memory**.
> "Priya just got a call from the GP. Watch —"

The **urgent alert** slides in: *rash after Co-trimoxazole (Bactrim) in March 2024.*
> "CareCircle remembered a reaction from **two years ago** that nobody mentioned. It doesn't tell Priya what to do — it tells her what to raise with the doctor."

Point at **"What CareCircle just learned"**:
> "And you can see exactly what Hindsight extracted from that one sentence."

### 6. Hands-free question — 15 s
**Ask** tab, **click the mic**, say: **"Is it okay to give Dad Bactrim?"** — then **stop talking**.
> "No typing, no send button — when I pause, it asks."

The answer recalls the 2024 rash and says to check with Dr. Mehta (no diagnosis — enforced by Hindsight directives).

### 7. The son abroad — 25 s
Switch **I am → Arjun (son)**. **Click "What's new"**.
> "Arjun lives in Seattle. He last checked two weeks ago. Instead of scrolling a family WhatsApp group, he gets only what changed — the urine infection, the dizziness, today's Bactrim flag — who reported it, and what he can do from Seattle."

**Close** the panel. Switch back to **Priya**.

### 8. Doctor visit brief — 25 s
**Doctor brief** tab → Dr. Sunita Kulkarni, last visit **Aug 10**, visit **Sep 30** → **Generate brief**.
> "Wednesday is the cardiology visit. One page for Dr. Kulkarni: medication changes and what happened after, the trends with real numbers, the overdue test, and questions to ask. The doctor gets the full history in 60 seconds."

Optionally click **Print**.

### 9. Care profile — 15 s
**Care profile** tab.
> "This is Hindsight's mental model of Ramesh — medicines, the sulfa reaction, active concerns, and preferences like *explain medicines in Marathi* and *tell him about hospital visits only the night before*. It updates itself as the family logs."

### 10. Close — 15 s
> "CareCircle uses Hindsight end to end — retain with real timestamps and reporters, reflect with structured output and citations, observations, a self-updating mental model, directives for safety, and checkpoint banks to prove it learns.
> Every family caring for a parent needs this; home-care agencies and hospitals can offer it to thousands. **Your family forgets. CareCircle doesn't.**"

---

## More questions that land well

| Ask | What it shows |
|---|---|
| Which medicines has Dad reacted badly to? | Recalls the Mar 2024 Bactrim rash |
| What did the doctors ask us to do that we have not done yet? | Overdue lipid profile + HbA1c (asked Jul 20) |
| What makes his evening sugar go up? | Wedding sweets (212), Ganesh Chaturthi modaks (204); walks help (141) |
| How should we prepare Dad for Wednesday's appointment? | Afternoon slot, tell him the night before, explain in Marathi |
| Has anyone told Dr. Kulkarni about the fall? | Nobody did (Arjun's note, Aug 26) |
| पापा को चक्कर कब से आ रहे हैं? *(Hindi)* | Answers in Hindi with the same dated facts |

**Voice logging in Hindi** (Log tab, language हिंदी):
*"पापा को आज सुबह फिर से चक्कर आया, BP 110/68, pulse 52"* → saved with an English summary and linked to the dizziness pattern.

**Safety demo** (optional, 10 s): Log *"Dad has chest pain right now"* → the red **Call 112** banner appears instantly, before any AI call.

---

## If something goes wrong

| Problem | Do this |
|---|---|
| An answer is slow (> 15 s) | Keep talking over the "Searching memory" animation; describe what it's doing |
| Learning-curve column shows an error | Checkpoint banks weren't seeded — skip to step 5 |
| Mic doesn't pick up | Type the sentence instead; mention voice supports English, Hindi, Marathi |
| Groq rate-limited | Nothing to do — it falls back to local Ollama automatically |
| Wi-Fi down | Play the backup recording |

---

## Likely judge questions

- **Why Hindsight and not a vector database?** Retrieval alone returns similar text. Hindsight gives us temporal reasoning ("3 days after the dose change"), observations that consolidate patterns, a mental model that stays current, and directives for safety — we'd have to build all of that ourselves.
- **What stops it from hallucinating?** Answers come from `reflect` over stored memories with citations; every date is fact-checked against the sources; a directive forbids moving events to a later message's date; no-diagnosis is enforced by directives.
- **Is it safe medically?** It never diagnoses or changes medication — it routes decisions to the doctor. Emergency detection is rule-based and runs before any AI.
- **Privacy?** Demo data is synthetic. Production: one bank per family, patient consent, encryption, access limited to the circle.
- **Business model?** Free for one family; paid family plan (~₹299/month); B2B for home-care agencies and hospital home-care programs, which already pay for coordination tools.
