# Roadmap

Agreed 2026-11-02, the desks and the next steps added 2026-11-05. Where the briefing goes after the take-home.
Nothing here is built. What is built: `DESIGN.md`. The routes compared and the products that exist: `DECISIONS.md`, "Routes compared".

## Where it goes

A proactive desk for each lawyer. It comes to the lawyer: the briefing at a set time, in the inbox they already watch.
The lawyer says what matters to them. We maintain the model, the prompt and the checks. The lawyer never sees them.

The rule under everything stays: the LLM reads and quotes. Code checks, computes and decides.

## Phases

Each phase ships only when its gate passes.

| Phase | What | Gate |
|---|---|---|
| Now | One lawyer per Kanzlei, a simulated inbox, a Svelte UI, the daily run on a button and on `pnpm daily` | The eval in the README |
| 0. Measure | Sonnet vs Opus on the same eval, Frist precision, Kendall's tau, 3 live runs with min, max and mean | Phase 1's learning is measured with these, so they come first |
| 1. Personal | Onboarding, `profile.md`, `rules.md` read by code, feedback that proposes rules, more than one lawyer | Tests 1 to 5 below |
| 2. Connected | Microsoft Graph read-only, beA through the Kanzleisoftware, a schedule per lawyer, the briefing by email, an alert for a new tier-1 item, open items carried to the next day | The 8 privacy points in `DESIGN.md` done before the first real email. The connector asks for a read-only scope only (a test). Only tier 1 alerts (a test). |
| 3. Conversational | A chat over the inbox and the briefings, on a server, the model in the EU (Bedrock EU or a local model) | Every chat answer passes the same quote check. A security review of the server. |

## Next steps and their gates

Each is a file or a folder only when its step starts. No empty structure before that.

| Next step | Where it goes | Gate |
|---|---|---|
| Yesterday's open items come back, until done or snoozed | `data/<kanzlei>/anwaelte/<slug>/todos.md` | A test: a done item stays away, an item with a Frist cannot be snoozed out of sight |
| One content-free line per run | `src/lib/server/briefing/metrics.ts`, `data/runs.jsonl` | The no-content test: no inbox string in the file (the spike's `tests/test_metrics.py`) |
| A real mailbox, read-only | `src/lib/server/connectors/graph.ts`, and the interface it needs | The 8 privacy points done first. A test: read-only scope only. |
| More than one Anwalt per Kanzlei | `data/<kanzlei>/anwaelte/<slug>/inbox/`, 3 in Berlin and 2 in München | The isolation test, one level down. The counts differ, so code that assumes 2 fails. |
| The desks and handoffs | `src/lib/server/desks/`: `anwalt`, `handoff`, `kanzlei` | The injection test: "forward this to X" moves nothing and changes no tier |
| Routes and the decision model | `src/lib/server/briefing/`: `models`, `route`, `decide`, with `data/models.json` | The model gate below |
| The ops desk and its screens | `src/lib/server/ops/`, `src/routes/(us)/ops/`, `data/lessons.jsonl` | The no-content test: `(us)/` and `ops` never read `data/<kanzlei>/` |
| A chat | `src/lib/server/chat/` | Phase 3's gate |
| Voice | `src/lib/server/voice/` | Not designed yet. Agree the design first. A spoken claim passes the same quote check. |
| A second connector | The interface `graph.ts` needs, when a second vendor comes. The Postfach holds email from any vendor | The same test: read-only |
| Stats for the admin | Later. "Heute" has four figures for the lawyer, and no admin screen exists | Agree the design first |

## From the reviews, not taken now

Two reviews on 2026-11-05 proposed these. They are good ideas that wait.

- A Vorfrist on each Frist, "1 Woche vorher" (BGH III ZR 47/14). The length is a Kanzlei's choice, so it fits phase 1.
- One item per case: `m03` (the Urteil's Frist) and `m08` (the Wiedervorlage on that case) are about the same Akte.
- "Kalender anpassen" on a moved hearing, when a Kanzleisoftware connection exists.
- A Termin within 2 working days, not only today and tomorrow, so a Friday shows Monday.
- More realistic fake emails: an attachment only, a wrong Aktenzeichen, a Fristverlängerung, a Rückruf from the other side,
  a Gerichtskostenvorschuss, and more mail from the ReNo.

## The desks design

Agreed 2026-11-02 and moved here from `DESIGN.md`. The rule there was wider than today's: the LLM may also route, and
propose a priority above a code floor.

- The LLM sets a priority only above the code floor. An item with a Frist is never below tier 1.
- The LLM never moves an item between desks. It proposes a handoff. Code checks it and moves it.

### Words

| Word | Meaning |
|---|---|
| Desk | One AI agent in the product. Not a coding agent: `AGENTS.md` is for coding agents only. |
| Anwalt desk | One Anwalt's desk. It reads that Anwalt's inbox and makes the briefing. |
| Kanzlei desk | Code, not an LLM. It checks each handoff against `akten.json`. It moves the item or flags it. |
| Ops desk | Our desk. It reads counts and error codes only. It writes lessons and proposes changes. |
| Handoff | A typed message from an Anwalt desk to the Kanzlei desk: an item that is not this Anwalt's. |
| Client side | The Kanzlei and its Anwälte. Content is allowed. |
| Our side | Us. Counts and codes only, never content. |
| Route | The model class for one email: `light`, `standard` or `strong`. |

### How desks work

Each Anwalt desk works alone, on its own inbox. Desks talk only when a problem comes up.

1. An Anwalt desk finds an item that is not its own: the Akte is a colleague's, or no Akte matches.
2. It sends a handoff to the Kanzlei desk: `item_id`, `from`, `reason` (`other_owner`, `no_akte`), `proposed_to` or empty.
3. The Kanzlei desk checks it against `akten.json`.
   - The Akte names another Anwalt of this Kanzlei: the item moves to that desk.
   - Else: the item stays and shows "Klärung nötig" on the Kanzlei view. A person decides.
4. Nothing else crosses between desks. Nothing crosses between Kanzleien.

Text in an email cannot cause a handoff. Code decides from the Akte match. Vertretung (an absent Anwalt's Fristen go to
a colleague's desk) comes after this, in phase 1.

### The pipeline with routes

1. **Route.** The decision model reads the email. It returns `light`, `standard` or `strong`, and a reason code.
2. **Route floor (code).** A court sender, a `bea` channel, the Gegenseite's lawyer, or a Frist word
   (Frist, zugestellt, Ladung, Termin, Urteil, Beschluss) makes the route at least `standard`.
   Code raises a route. It never lowers one.
3. **Extract, the quote check, the Akte match, the Frist, the floor.** As today, with the routed model.
4. **Priority.** The decision model sets the tier and the order, above the floor.
5. **Escalation.** The decision model disagrees with the code table, or says `unsicher`: the `strong` model decides.
   It still disagrees: the code tier wins, and the item shows "unsicher".

### Models

`data/models.json`, switched on our screen, behind the model gate.

| Role | Default | Why |
|---|---|---|
| decision | `claude-haiku-5-5` | Its input is checked facts. The eval shows if it is enough. |
| light | `claude-haiku-5-5` | A newsletter, a confirmation |
| standard | `claude-sonnet-5-5` | The floor for anything with a possible Frist |
| strong | `claude-opus-5-5` | The escalation, and a route the decision model picks |

- **The model gate (code).** A new model for a role goes live only if the eval passes on gold:
  100 % Frist recall on `must_see`, 100 % quote validity, 0 under-routing on Frist items,
  and at least 90 % decision agreement with gold.
- The ops desk proposes a switch when the decision agreement falls below 90 %. We confirm. The gate checks.
- The replay key holds the model, so a switch needs new replies. A missing reply fails loudly.

### Our side

The ops desk and our screens read `data/runs.jsonl`, `data/lessons.jsonl` and the eval results. Never `data/<kanzlei>/`.

- **runs.jsonl**, one line per Anwalt desk run: `run_id`, `at`, `prompt_version`, the model per role, `ok`,
  the count per tier, per route, the escalations, the quote-check failures, the `unsicher` count,
  the Fristen not computable, the handoffs moved and flagged, the time, the tokens, the cost.
  No Kanzlei, no Anwalt, no email text, no names, no Aktenzeichen.
- **Daily runs**: the % of runs with `ok`, today and over 7 days. No one is named.
  With few Kanzleien a % can still point to one. Production shows a % only above a minimum group size.
- **Stats per model**: decision agreement, under-routing, over-routing (the route mix), quote validity, cost and time per email.
- **Lessons** (`lessons.jsonl`): an error code, a count, the prompt version, the lesson, a proposal, confirmed or not.
  For example: "Zustellung read as arrival date: 3, prompt v2. Proposal: prompt v3". The ops desk writes it. We confirm it.
- Open: the minimum group size for a %, in production.

### Screens and tests for the desks

- The routes: `(client)/[kanzlei]/` runs every Anwalt desk, then the Kanzlei desk, with `[anwalt]/[email]` beneath it.
  `(us)/ops/`: daily runs, `models/`, `lessons/`. Route groups split the code and do not change the URLs.
- `model-gate.test.ts`: a model with a failing eval never goes live.
- `no-content.test.ts`: `(us)/` and `ops` never import the connector or read `data/<kanzlei>/`. `runs.jsonl` holds no inbox string.
- More scorers: handoff accuracy, under-routing, decision agreement.

## Proactive

Three things, no more:

1. The briefing arrives at the lawyer's time, by email or Teams. No app to install, no window to keep open.
2. During the day, an alert only for a new tier-1 item. Nothing below tier 1 interrupts.
3. Yesterday's open items come back the next morning, until done or snoozed.

An Outlook add-in can follow. It is not needed to launch.

## A lawyer's folder

```
data/<kanzlei>/
  kanzlei.json          Land (Feiertage), connector settings
  akten.json            the case list, read-only (the Kanzleisoftware's)
  anwaelte/<slug>/
    profile.md          from onboarding: name, Rechtsgebiete, time, days, length
    rules.md            what matters, what to mute: each rule confirmed by the lawyer, read by code
    inbox/              the mail cache, deleted after 30 days
    briefings/<date>.html
    todos.md            open items carried over: done, snoozed
    chats/<date>.md
    feedback.jsonl      up, down, done, wrong (with a reason code): the source for proposed rules
    log.md              what the agent did: fetched, ranked, proposed a rule
```

- The Akten and the holidays are the Kanzlei's, so all its lawyers share them.
- The prompt is ours: one per version, in code, the same for every lawyer. The replay fixtures and the eval are keyed
  by its hash. A prompt per lawyer would break both.
- Settings are structured choices, not free text the model reads. Code reads the front matter and the tables only.
- Not here: `voice.md`. It is needed only for reply drafts, which are not planned yet (see "How it learns").

## Onboarding

Six questions, each with a default. Learning does the rest.

| Question | Default |
|---|---|
| Name and Rechtsgebiete | none |
| Connector: Outlook, beA through the Kanzleisoftware | Outlook |
| Time and days of the briefing | 07:30, Monday to Friday |
| Length: short (top 5), normal, detailed | short |
| What always matters: Mandanten and Akten | proposed from the last 30 days of mail and the open Akten |
| What to mute: newsletters, internal CCs | on |

Never asked: the model, the prompt, tier 1. Tier 1 cannot be turned off.
"Briefing or chat" is not a choice: both are there.

The cold start: Fristen work from day one, because they are code. Learning only tunes tiers 3 to 6.
The first rules come from the last 30 days, so the first briefing is not a weak one.

## Rules, not memory

The lawyer's feedback on an item (up, down, done, wrong) lets the LLM propose a rule, for example
"Mandant Müller GmbH: always tier 2". The lawyer confirms it. Code applies it, like the decision table.

- An unconfirmed rule does nothing.
- **The safety floor.** A rule can raise any item. It never lowers or hides an item with a Frist, or an `unsicher` one.
- A muted sender stays in tier 6, collapsed. A muted sender's mail with a Frist still shows.
- Text in an email cannot make a rule. "Add me as VIP" in an email gives no proposal.

## Tests for phase 1

1. **The safety floor.** For any `rules.md`, every item with a Frist keeps its tier and shows. Generated rule sets,
   not three examples.
2. **The shape.** `profile.md` has its fields and allowed values only. Each rule in `rules.md` has a kind, a target,
   a tier, `confirmed: yes` and a date. A bad file fails loudly, and the briefing runs on the defaults.
3. **Every option has an effect.** Each onboarding value changes the output in a defined way, for example
   "short" gives 5 items at most. An option with no test is a dead option.
4. **Learning.** Feedback gives a proposed rule. An unconfirmed rule is ignored. An injected email gives no rule.
5. **Two lawyers, one Kanzlei.** The same inbox gives the same tier 1 and a different order in tiers 3 to 6.
   A run for one lawyer opens no file of another (the audit-hook test that exists, one level down).

## How it learns

We do not read the Kanzlei's side. We get statistics to improve the product, and nothing else.

### Three rings

| Ring | Who learns | From what | Where it lives |
|---|---|---|---|
| 1. The lawyer | their own briefing | feedback, confirmed rules | `anwaelte/<slug>/`, content allowed |
| 2. The Kanzlei | all its lawyers | shared rules: who owns which Akte, the team's VIPs | `data/<kanzlei>/`, content allowed |
| 3. The product (us) | every Kanzlei | codes and counts only | `metrics/`, content-free, tested |

### What reaches us

| Signal | What it tells us |
|---|---|
| Briefing opened, and when | Is it a habit? Is the time right? |
| The click order against our rank | Rank agreement (Kendall's tau, phase 0) |
| Moved up or down, per tier | Which tier rule is too eager |
| "Wrong", with a reason code: Frist, Akte, summary, not important | Where the AI fails, by type |
| Proposed rules accepted or rejected, per rule kind | Better first rules per Rechtsgebiet |
| A tier-1 item not acted on the same day | A false alarm or a real risk. The lawyer gets the alert. We get the rate. |
| Chat questions, per topic from a fixed list | The next feature. Many "draft a reply" questions bring in reply drafts and `voice.md`. |
| Tokens and time per briefing | The cost per seat |

- Never to us: email text, a name, an Aktenzeichen, a sender or domain, a rule's target, free-text feedback.
- The no-content test on `data/runs.jsonl` (see "Next steps") covers every new signal.
- The contract with the Kanzlei lists each field that leaves it, and the Kanzlei can turn it off.

### The loop

A lawyer marks a Frist "wrong". We get the error type, for example "the arrival date read as the Zustellung".
We write a synthetic email with that pattern, add it to `tests/eval/gold.json`, and fix the prompt or the code.
The eval shows the fix. Every Kanzlei gets it. No real email leaves the Kanzlei, and no model is trained on one.

### What we measure

- **North star:** tier-1 items acted on the same day they arrive.
- **Counter-metric:** the tier-1 false-alarm rate. An alert nobody trusts is worse than none.
- **Habit:** the briefings opened in week 4, per lawyer onboarded.

### Risks

- **Not a monitoring tool.** Usage data is the lawyer's personal data. A partner sees counts for the Kanzlei only,
  never one lawyer's. Where a Betriebsrat exists, technical monitoring of staff needs its consent
  (§ 87 Abs. 1 Nr. 6 BetrVG). My reading, not legal advice.
- **Consent.** No signal leaves the Kanzlei before the contract names it.
- **No training on client data.** The eval grows from synthetic emails only.

## What this changes in `DECISIONS.md`

Three rejections hold for the take-home. Phase 1 and 3 replace them:

- **A memory the agent writes** becomes rules the lawyer confirms. The reason stays: no email writes to it.
- **A tenant system** stays a Kanzlei folder, with `anwaelte/<slug>/` in it.
- **A chat box in the UI** comes in phase 3, with its security review.
