# Team video (Prompt 5 + recording guide)

**Length:** about 3 min (2–5 min allowed) · **Resolution:** 1080p or higher · **Publish:** YouTube, **Public**.

---

## How to record it (on a Mac)

**Easiest: screen and face together, free**
1. Install **OBS Studio** (free) or use **Loom** (free tier, max 5 min, fine for this).
2. OBS setup: Sources → *Display Capture* (your screen) + *Video Capture Device* (webcam), drag the webcam to a small circle in the bottom-right corner. Settings → Video → *Output resolution 1920×1080*, 30 fps. Settings → Output → *Recording format mp4*.
3. Use a headset or AirPods mic. Audio matters more than video.

**Simplest: screen only**
- Press **Cmd + Shift + 5** → *Record Entire Screen* → Options → choose your microphone. This saves an .mov file to your Desktop.

**Before you hit record**
- Browser zoom 110–125% so text is readable on YouTube; hide the bookmarks bar (Cmd + Shift + B).
- Turn on Do Not Disturb, close Slack and other notifications, close other tabs.
- Run every question once beforehand so the answers are fast, then click **New conversation**.
- Do one practice run. Don't read the script word for word: glance at it, then talk.
- If you make a mistake, pause 2 seconds and repeat the sentence; cut it later in iMovie (free) or keep going. Authentic beats polished.

---

## Script (about 3 minutes)

### 0:00–0:30 — Intro (camera on, app visible behind)
**Say:** "Hi, I'm Raju. My friend's father fell in his bathroom last month. Afterwards, the family realised four different people had seen the warning signs — the nurse, his son, his daughter — and none of them knew the others had. So we built CareCircle: one shared memory for everyone caring for a parent, built on Hindsight, so the agent connects what each person records over weeks."
**Show:** Click the **Ramesh Sharma** card in the header → the profile modal (circle of carers, doctors, memory count). Close it.

### 0:30–1:00 — The problem: an agent without memory
**Show:** Ask tab, mode **vs no memory**. Click the suggestion *"Dad has been dizzy again this morning. What should I tell the cardiologist?"*
**Say (pointing at the left card):** "This is the same AI with no memory. The advice is fine for anyone — and useless for Ramesh. It doesn't know he's on Metoprolol, doesn't know he fell, doesn't know what the cardiologist asked for."

### 1:00–2:30 — Live demo: retain and recall
**1:00 — The memory answer.** Point at the right card:
"CareCircle calls Hindsight's `reflect` on this family's memory bank. The dizziness started three days after the dose was doubled on August 10. It was reported by three people. There was a fall on August 22, and the lipid test from July is still pending." Point at the green **"All dates match the family's records"** badge and expand **"Based on N memories"**: "Every date is checked against the sources, and each source shows who recorded it."

**1:30 — Watch it learn.** Click **New conversation** → **Watch CareCircle learn**.
"Same question, asked of the memory as it was at Week 1, Day 45 and today. These are separate Hindsight banks seeded up to each date — `backend/scripts/seed.py --checkpoints`. Week 1 knows his medicines. Day 45 has just seen the dose change. Today connects everything. Same model; only the memory changed."

**2:00 — Retain, live.** **Log** tab. Click the mic and say: *"Dr. Mehta wants to start Bactrim DS twice a day for five days."* Save.
"This goes through `POST /api/log`: it's structured, retained into Hindsight with the real timestamp and who reported it, and checked against history." The urgent alert appears: "It remembered a rash from Bactrim in March 2024 that nobody mentioned." Point at **"What CareCircle just learned"**: "And here's exactly what Hindsight extracted from that sentence."

**2:20 — Shared memory.** Switch **I am → Arjun**, click **What's new**: "Arjun lives in Seattle. He gets only what changed since he last checked, and who reported it."

### 2:30–3:00 — Takeaway (camera on)
**Say:** "What surprised me: the smart behaviour didn't come from prompt engineering. It came from what we wrote into memory — the real event time, and who said it. Get that right and Hindsight's reflect connects the dots on its own. The code is on GitHub — link below. Thanks for watching."

---

## YouTube titles (pick one)

1. Four People Saw Dad's Warning Signs. This AI Connected Them.
2. I Asked My AI the Same Question at Day 1 and Day 90
3. This AI Remembered a Drug Reaction From 2 Years Ago
4. Building an AI That Remembers What Families Forget (Hindsight)
5. AI Agent With Memory vs Without: A Caregiving Demo

## YouTube description (paste and fill in)

```
CareCircle is a shared memory for families caring for an elderly parent. Siblings, the home nurse and doctor visits all feed one Hindsight memory, and the agent connects what each person records over weeks.

In this demo:
0:00 Why we built it
0:30 The same AI without memory
1:00 Answers from shared memory, fact-checked
1:30 Watching the agent learn: Week 1 → Day 45 → Today
2:00 Voice logging and a live drug-reaction alert
2:20 Catch-up for the sibling abroad
2:30 What surprised us

Code: GITHUB_REPO_URL
Article: ARTICLE_URL
Hindsight (agent memory): https://github.com/vectorize-io/hindsight
Hindsight docs: https://hindsight.vectorize.io/

Built by: <team member names>
```
Don't use the word for the event anywhere in the title, description or tags.

## Thumbnail (Prompt 6, for Google Nano Banana / Gemini)

Attach a photo of one or more team members, then paste:

```
Generate a viral YouTube thumbnail, 16:9. Left side: the attached person, looking surprised, pointing at the right side. Right side: a clean app screen with two answer cards side by side — the left card grey and labelled "NO MEMORY", the right card glowing teal labelled "WITH MEMORY" showing "Dizziness began 3 days after dose change". Big bold text across the top: "IT REMEMBERED." Small text: "an AI with memory for families". Warm teal and amber colours, high contrast, readable on a phone, no clutter.

Video script:
<paste the script above>
```
