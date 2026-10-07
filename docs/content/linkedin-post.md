# LinkedIn post (Prompt 3)

Post this **after** the article is live. Replace `GITHUB_REPO_URL` first (see note at the bottom).

---

Your agent's memory is only as good as what you write into it.

I learned that building a care agent for families looking after an elderly parent.

Four people log notes: two siblings, a nurse, doctor visits. None of them sees the whole picture.

What made it work with Hindsight agent memory:

→ Store when it happened, not when it was typed
→ Put the reporter in the memory text; "reported by 3 people" is the killer answer
→ Safety rules as directives, not prompts
→ Fact-check every date against its sources

Before: "stay hydrated, stand up slowly."
After: "dizziness began 3 days after the dose was doubled; the lipid test from July is overdue."

Code: GITHUB_REPO_URL

#AIAgents #AgentMemory #Hindsight #LLM

---

## First comment (article link)

Full write-up, with code, the bug that moved a fall to the wrong day, and how I prove the agent learns: ARTICLE_URL

## Second comment (Hindsight link)

Here's Hindsight if you want to try it: https://github.com/vectorize-io/hindsight

## Remember

- Tag **Code.in** and **Vectorize** in the post (type @ and pick the company page).
- Don't use the word for the event anywhere, including hashtags.

## ⚠️ Before posting: rename the GitHub repo

The repo is currently named `Hackathon-ms`. That word would appear in the link in your main post. Rename it on GitHub (Settings → General → Repository name), e.g. to `carecircle`. GitHub redirects the old URL automatically. Then update your local remote:

```bash
git remote set-url origin https://github.com/<your-username>/carecircle.git
```
