# Morning Briefing für Anwälte

A morning briefing built from a lawyer's inbox. It answers the first questions of the day: do I have a hearing, what must
I do today, which Frist is at risk, what else came in. Every claim shows its source.

**The rule under everything: the LLM reads and quotes. Code checks, computes and decides.**
The LLM never states a fact without a verbatim quote from the email. It never outputs a Frist end date or a rank.

## How to test it

You need Node 22.18 or newer and pnpm. You need no login and no API key: the default mode replays recorded model replies.

```sh
pnpm install
pnpm dev        # open http://localhost:5173
```

1. Pick a Kanzlei. It asks you to connect first, because an inbox nobody has read is not an empty inbox.
2. Click "Demo-Postfach verbinden". This runs the same code as `pnpm daily`.
3. Read "Heute". Click a row: its email opens in a side sheet, with the quoted words marked.

Worth clicking:

| Where | What it shows |
|---|---|
| Berlin, "Datum prüfen", B-26-101 | A beA mail from the court with no Zustellung date. "Frist nicht berechenbar", no guessed date. |
| Berlin, "Zeitleiste", B-26-103 | A Kündigung that came "gestern". The 3 weeks of § 4 KSchG come from code, and the date asks to be checked. |
| Berlin, "Zeitleiste", Stellungnahme bis 21.11. | The court's date is a Saturday. Both dates show, see "Not sure" below. |
| München, "Zeitleiste", 3 Nov, Mündliche Verhandlung | A hearing tomorrow, from the case list. No email is behind it, so the row does not open anything. |
| München, "Zeitleiste", 12 Nov, Einspruch | One Frist in a court mail and in its forward: one item, both emails. |
| München, "Postfach", "Warnung" | An email that tells the AI to rank it first. It stays at the lowest rank, with a warning, and reaches no task or calendar. The AI button stays off on it. |
| München, "Postfach", the "Verbundenes Konto" figure | The connectors in a modal. Add one: it says it has no demo emails behind it, so it does not look like an empty inbox. |
| München, "Postfach", Bitte dringend zurückrufen, the ✦ | A recorded reply draft in a modal, with what only the lawyer can add left in brackets. Send it: it shows as answered, simulated, and nothing leaves. |

The checks, all without a login:

```sh
pnpm test       # 262 tests. One more is skipped: the live canary below
pnpm check      # svelte-check
pnpm eval       # the table below
pnpm daily      # every Kanzlei once. Exits non-zero on a failure or an email not read
```

With `claude` on the PATH and logged in:

```sh
BRIEFING_CONTEXT_CHECK=1 pnpm test tests/context.test.ts   # one model call: no CLAUDE.md reaches it
BRIEFING_LIVE=1 pnpm daily                                 # 28 model calls. Overwrites the recorded replies
```

## Why these features first

A missed Frist is the lawyer's fault and the client's loss: § 85 Abs. 2 ZPO puts the lawyer's fault on the party, and
Wiedereinsetzung (§ 233 ZPO) needs a party "ohne ihr Verschulden verhindert". Practitioner sources call Frist mistakes the
most common cause of liability claims. They often say about half, but none I found cites a study. Sources: `docs/RESEARCH.md`.

So the app has two tabs.

**"Heute"** is built by code from facts already checked, with no extra LLM call:

| Part | What |
|---|---|
| Four figures | Tasks open, the next Termin, the next Frist, and the emails read and not read, because a silently dropped email is the worst failure. |
| Heute tun | A client asks for action today, or a Wiedervorlage is due today. |
| Abgelaufen, Datum prüfen | A Frist already past. A row with no date that code can place. Each shows only when it has rows. |
| Zeitleiste | Every dated Termin and Frist by day, in one scroller. A click on a day in the month moves it there. |

A row opens its email in a side sheet, with the quotes marked.

**"Postfach"** lists every email, newest first, under four figures: the connected account, the emails, the unread ones and how many reach "Heute". A row shows who wrote, the subject and the model's line. A tag gives a Frist or a Termin its date, the same one as on "Heute".
The email opens beside the list as a mail client shows it: who wrote, the model's one line with its quotes marked in the email, what code checked.
Icons answer, forward, mark it unread and archive it. **All of that is simulated:** it writes `out/mailbox.json`, never touches the inbox's
files, and sends nothing. An archived email stays on "Heute" with its Frist. There is no delete, because a dropped email is the worst failure.
beA has no answer here: in reality it needs its own card and the Kanzleisoftware, so the server refuses one.
The "Verbundenes Konto" figure opens the connectors. Adding Google Workspace or IMAP is simulated too: no login, and no mail comes from it, because `loadInbox` is still the only code that reads mail.

The rank is a decision table in code. The sheet's title and the Postfach say it.

| Tier | Rule | Why |
|---|---|---|
| 1 | Court mail with a Frist (found or unsure) | Notfristen run from Zustellung (§§ 339, 517 ZPO). The eEB date counts, not the arrival (§ 173 Abs. 3 ZPO). |
| 2 | Client mail that starts a Frist (a Kündigung, a Mahnbescheid, a Klage) | The Frist often runs already. Kündigungsschutzklage: 3 weeks from Zugang (§ 4 KSchG). |
| 3 | The other side with a deadline | My reasoning. |
| 4 | Client asks for action today | My reasoning. |
| 5 | Wiedervorlage today, an open Frist in the case list within 7 days, or court mail with a Termin | The BGH expects a Vorfrist the lawyer checks (III ZR 47/14). A hearing is a fixed calendar fact. |
| 6 | Everything else | Newsletters, invoices, notices. |

- In a tier: an end date not computable first, then the fewest days left, then the oldest email.
- When unsure, rank higher. A sender role the code cannot confirm takes the highest tier any role would give.
- A sender known as `other` stays out of "Heute", so a newsletter's "letzte Frist" cannot reach the top by its text.

## Why this way technically

```
data/<kanzlei>/inbox/*.json   the simulated inbox, with Microsoft Graph's fields     connector.ts
  → extract   one LLM call per email: the facts, each with a quote                   extract.ts, llm.ts
  → verify    code: each quote is in that email, or the fact is "unsicher"           verify.ts
  → frist     code: §§ 187, 188 BGB, § 222 Abs. 2 ZPO, the Land's holidays           frist.ts
  → rank      code: the tiers, then "Heute"                                          rank.ts, day.ts
  → data/<kanzlei>/out/briefing.json   SvelteKit reads it. The button starts the same run.
```

- **Quotes checked by code.** A fact whose quote is not in the email is kept and marked "unsicher". It is not dropped, because a
  wrong "nothing here" costs more than a doubtful line.
- **A Frist the model leaves out.** The quote check tests what the model said, not what it left out. So a court's mail with no Frist from
  the model, whose text holds Frist wording, gets an open row in "Datum prüfen". Code finds the words and guesses no date. It covers a court's mail only.
- **Fristen computed by code.** They are rules, so code applies them the same way every time and a test can pin them.
  The screen says "berechnet, bitte prüfen".
- **The rank is code, not the LLM.** An email that says "rank this first" gets a warning, not a tier.
- **One SvelteKit app.** One language and one install. The briefing is a file on disk, so a schedule later reads the same result.
- **Reply drafts are recorded, and code checks what it can.** The ✦ needs a free text, so nothing can quote it. `scripts/record-drafts.ts`
  recorded one per email with its own prompt, so the demo needs no login, and the briefing's prompt and replies did not change. A draft
  that names a number or a day its email does not hold is refused. beA, newsletters, invoices and the injection get none. The lawyer edits it, and it sends nothing.
- **`src/lib/design/` is a copy** of my own design system, so `pnpm install` needs no other repo. A change goes there first.
- **A simulated inbox.** The brief allows it. A real connector replaces `loadInbox`, the one seam. beA is simulated as mail.
- **`claude -p` for the demo.** `callLlm` is the only code that calls a model. It runs with no `CLAUDE.md`, settings or tools. The
  account email and the working directory still reach it, which is one more reason production swaps it for the Anthropic SDK.

The other routes (Cowork, n8n, Copilot, Kanzlei products) and what I rejected: `docs/DECISIONS.md`. All the rules: `docs/DESIGN.md`.

## The eval

28 fake emails, 14 per Kanzlei, written for this, with hand labels in `tests/eval/gold.json`. They hold 11 traps: a beA mail with no
Zustellung date, a Termin and a Frist in one mail, an end on a Saturday, an end on a holiday, a Kündigung "gestern", a Frist
already met, a newsletter's "letzte Frist", a forwarded Frist, a date only in a quoted older reply, an injection, and a
relative date ("bis Freitag"). The scorers are code, and each scores a perfect prediction full and fails a wrong one.

`pnpm eval`, on the recorded replies:

| Scorer | Berlin | München | Both |
|---|---|---|---|
| Frist recall, must-see | 3/3 | 4/4 | 7/7 |
| Frist recall, all | 4/4 | 5/5 | 9/9 |
| End-date accuracy | 4/4 | 5/5 | 9/9 |
| Quote validity | 49/49 | 57/57 | 106/106 |
| Must-see in the top 3 | 3/3 | 3/3 | 6/6 |
| Tier accuracy | 14/14 | 14/14 | 28/28 |
| Akte match | 14/14 | 14/14 | 28/28 |
| Injection flagged, not in top 3 | n/a | 1/1 | 1/1 |
| Schema validity | 14/14 | 14/14 | 28/28 |

Read it with care:

- **"Must-see in the top 3" describes the rank, not the screen.** The screen sorts Fristen by date.
- **It is directional, not a benchmark.** One recorded run, n=14 per Kanzlei. The emails are cleaner than a real inbox: no
  attachments, no HTML, no long threads.
- **A full score does not prove a good briefing.** It was already full while a court's moved hearing sat in a collapsed
  "Rest" on an earlier screen, because my own gold label put it there. Reading the briefing as a lawyer found that, not the eval.
- **End-date accuracy tests the calculator more than the LLM.** The LLM only copies "zwei Wochen" and "29.10.2026".
- **Frist precision has no scorer.** A one-time count against the labels: the recorded run predicts no extra Frist.
- **The recorded run:** 28 calls to `claude-sonnet-5-5`, 3.8 s per call on average, 7.3 s at most, about 89,000 input and 16,000 output
  tokens. `claude -p` reports $0.27. That is a list price, not a bill: the calls ran on a subscription.
- **A second live run of the 28 (2026-11-05).** Every scorer gave the same score. One model answer changed: `b12`'s sender role, from client to other, in the same tier. Its replies are not in this repo.
- **Ten emails it had not seen (2026-11-05).** A separate AI agent wrote them with their answers, and saw neither the prompt nor these 28. They are harder, and they are still fake:
  the same kind of model wrote and read them, I wrote that agent's brief, and no lawyer checked its answers. Ten is a small sample. They are in `tests/eval/unseen/`, and `node tests/eval/unseen/score.ts` prints these numbers with no login.
  - Of 8 Fristen the model found 7. 6 have the right end date. The 7th, a Mahnbescheid a client reports, stays open with "Fristlänge prüfen", because code has no length for it. No date was wrong.
  - The one it missed stands only in a quoted older reply, in the lawyer's own earlier mail. The prompt tells it to skip those, because of the trap above, so this rule costs something.
  - It invented no Frist in the 4 emails that hold none. 48 of 49 quotes passed, and the other shows "unsicher".
  - The check for a Frist left out fired once, and that was a false alarm: a court confirming a Frist already met. The model missed no Frist in a court's mail, so the check has only caught Fristen I removed on purpose.

## Not sure, not built

- **No lawyer has read this.** The tier order and "Heute" come from sources and my reasoning.
- **A Frist the model misses outside a court's mail stays silent.** A forward from the secretary, a client, the other side: nothing in code checks those. The email stays in the Postfach.
- **The reply drafts are thin, and the eval does not score them.** Most are a greeting, a thanks and brackets, on purpose: the model knows no
  case file. The code check catches a number or a day. It cannot catch an invented promise, so the modal says to check the draft.
- **A phone.** "Heute", its side sheet and the Postfach's modal were measured at 390px, not looked at.
- **§ 222 Abs. 2 ZPO on a date the court set.** I am not sure it moves that date, so both dates show and the rank counts to the
  court's date.
- **A known gap.** An email that claims in its text to come from a court, but does not come by beA, keeps the LLM's role if the
  quote checks. A court role from metadata alone would close it, at the risk of ranking a real court letter a client forwards lower.
- **Not built:** a real mailbox, a schedule, a chat, Sonnet against Opus on the same eval, Frist precision, more than one lawyer
  per Kanzlei. Each has a gate in `docs/ROADMAP.md`, which is what I would build next and in which order.
- **Fake data only.** A real Kanzlei needs a contract under § 43e BRAO, a DPA, EU processing and more: `docs/DESIGN.md`, "Privacy".

## How it was built

The brief asks for the AI prompt history. This repo holds a summary instead, `docs/HOW-IT-WAS-BUILT.md`, because the sessions ran in
my private workspace, which holds unrelated personal data.

## Docs

| File | What |
|---|---|
| `docs/BRIEF.md` | The assignment |
| `docs/HOW-IT-WAS-BUILT.md` | The steps, what the AI suggested, what I rejected and why |
| `docs/DECISIONS.md` | The choices, the routes compared |
| `docs/DESIGN.md` | The rules, the pipeline, the port, the stop points |
| `docs/RESEARCH.md` | The sources |
| `docs/ROADMAP.md` | Where it goes next, with gates |
