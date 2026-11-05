# Design

Agreed 2026-11-05. The assignment: `BRIEF.md`. The sources: `RESEARCH.md`. Why we chose this: `DECISIONS.md`.
Everything after this submission: `ROADMAP.md`.

A Python spike (`../morning-briefing`, outside this repo) proved the pipeline. This repo ports it to TypeScript
and adds a UI. The spike does not ship. It stays as the reference until the port matches it.

## The rule under everything

The LLM reads and quotes. Code checks, computes and decides.

- The LLM never states a fact without a verbatim quote.
- The LLM never outputs a Frist end date or a rank.
- Text in an email cannot change a rank. An injection attempt gets a warning, not a different tier.

## The workflow

### A tester (Florian)

No login and no API key. The default mode replays recorded LLM replies.

```sh
pnpm install
pnpm dev        # open localhost:5173
```

1. Pick a Kanzlei. The screen shows "Postfach: simuliert".
2. Click "Tageslauf starten". This runs the same code as `pnpm daily`.
3. Read the briefing.
4. Click an item. Its email opens beside the briefing, with the quoted words marked.

The quality checks: `pnpm test` and `pnpm eval`. `BRIEFING_LIVE=1` calls the real model and needs `claude` on the PATH.

### A lawyer in the morning

The first question is "do I have a hearing today?". Then: who must I call, which Frist is at risk, what else came in.

This is the content of the screen. The look is agreed at the mock (build step 4).

```
Mo 2 Nov · Postfach: simuliert · 14 E-Mails gelesen, 0 nicht gelesen

HEUTE
  Termine   keine heute oder morgen
  Anrufen   Testmann: Personalgespräch um 14 Uhr, Rückruf am Vormittag
  Prüfen    12 Ca 3456/26: Frist nicht berechenbar, Zustellungsdatum prüfen
  Bald      B-26-105: Replik bis 04.11.

FRISTEN UND REST
  Items by rank, tier 6 collapsed. A click opens the email, quotes marked.
```

In this version a lawyer only reads the screen, on the fake inbox. A real mailbox and a schedule: `ROADMAP.md`.

## "Heute"

Code builds it from existing facts. No LLM call and no new prompt. Its lines, in this order:

| Line | Source | Note |
|---|---|---|
| Termine | `termine[]` in `akten.json`, today and tomorrow | Always shown. Empty state: "keine Termine heute oder morgen" |
| Anrufen | `urgent_request`, `wiedervorlage_today` | Same-day items come first in "Heute" |
| Prüfen | a Frist with no computable end date | `b01`. A relative date such as "bis Freitag" (`m06`) is here or in Bald |
| Bald | any Frist with 7 days or fewer left, from an email or `akten.json` | A Frist already past is here too, first |

A sender known as `other` stays out of "Heute", as in the tiers: a newsletter's "letzte Frist" must not reach it. An unsure
role stays in.

An item in "Heute" stays in its tier as well. Both open the same email.

The coverage line counts the emails read and the emails not read. A silently dropped email is the worst failure.

## The tiers

| Tier | Rule (code, over checked facts) | Why |
|---|---|---|
| 1 | Court mail with a Frist (found or unsure) | Notfristen run from Zustellung (§§ 339, 517 ZPO). The eEB date counts, not the arrival (§ 173 Abs. 3 ZPO). |
| 2 | Client mail that starts a Frist (a Kündigung, a Mahnbescheid, a Klage) | The Frist often runs already. Kündigungsschutzklage: 3 weeks from Zugang (§ 4 KSchG). |
| 3 | The other side with a deadline | A settlement offer, a Fristsetzung. My reasoning. |
| 4 | Client asks for action today | My reasoning. |
| 5 | Wiedervorlage today, an open Frist in the case list within 7 days, or **court mail with a Termin** | The BGH expects a Vorfrist the lawyer checks (III ZR 47/14). A hearing is a fixed calendar fact, my reasoning. |
| 6 | Everything else, collapsed | Newsletters, invoices, notices. |

- In a tier: an end date not computable first, then the fewest days left, then the oldest email.
- When unsure, rank higher. A sender role the code cannot confirm takes the highest tier any role would give.
- The same Frist in two emails (a court mail and its forward) is one item, both emails linked.
- Sender role: metadata wins over the LLM. A beA message from a court domain, the Kanzlei's own domain, a known Mandant.

### The hearing rule

This is the one change to the spike's tiers. A court mail with a Termin leaves tier 6.

- `b11` (a moved hearing) and `m09` (a new hearing) go from tier 6 to tier 5. Their two gold labels change with the rule, in one commit.
- `b02` stays tier 1, from its Frist. Its Termin shows on the item.
- A moved hearing shows its old date beside the new one. No prompt change: `events[].what` already holds it as free text.
- That text sits outside the quote. Code shows the old date only if it finds that date in the email's body.
- The rule is `role == court && events.length > 0`. Prompt v2 stays, so the 28 recorded replies stay.

### A date the court set

This is a separate rule, about the Frist's date, not about a hearing. It changes the order in a tier, not a tier.

Code moves an end on a Saturday, a Sunday or a holiday to the next Werktag (§ 222 Abs. 2 ZPO). `b02`: the court says
"bis zum 21.11.2026", a Saturday, and code computes 23.11.

- Whether § 222 Abs. 2 ZPO moves a date the court set is not sure. Do not state it either way.
- So a date the court set ranks by itself: `days_left` counts to 21.11. "Bald" uses that date too.
- The moved date shows beside it: "21.11. (Gericht), 23.11. nach § 222 Abs. 2 ZPO, bitte prüfen".
- The trigger is `stated_date`. No prompt change. Gold's `end` stays 23.11, so the end-date scorer does not change.
- Check at the test: which other emails have this case, and whether a must-see item moves in the top 3.

## Stack

- SvelteKit 3 (Svelte 5), TypeScript, pnpm, Vitest. One language and one install. Its config is in `vite.config.ts`.
  Its import alias is `#lib`.
- LLM calls run on the server only: `claude -p`, on the developer's subscription.
- `callLlm` in `llm.ts` is the only code that calls a model. Production swaps it for the Anthropic SDK with an API key.
- `is_error` is the field to trust. A refused call still says `subtype: "success"`.
- `claude-sonnet-5-5` is the default model. The comparison with Opus has not been run.
- No new dependency for the schema check. One schema object, and a small `errors()` as in the spike.

### What reaches the model

`claude -p` loads the user's `CLAUDE.md` files, hooks and plugins unless told not to. The spike measured this with a
planted canary `CLAUDE.md` and the input token count:

| Variant | Input tokens | Canary `CLAUDE.md` | User's global `CLAUDE.md` | Account email, working dir |
|---|---|---|---|---|
| default | 4069 | seen | seen | seen |
| `--setting-sources ""` | 1227 | no | no | seen |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` | 3266 | no | no | seen |

`callLlm` uses both switches, `--tools ""`, `--no-session-persistence` and `--strict-mcp-config`. It runs in an empty
temp directory, because this repo holds `AGENTS.md` and `CLAUDE.md`. `tests/context.test.ts` repeats the canary check.
It is live, so it is skipped unless `BRIEFING_CONTEXT_CHECK=1`. `pnpm test` itself cannot go live: `vite.config.ts` turns `BRIEFING_LIVE` off for it. The account email and the working directory still reach the call. That is one
more reason the SDK replaces `claude -p` in production.

## Folders

```
kanzlei-agent-desk/
├── README.md                  how to test it, why this order, the eval table
├── AGENTS.md                  how to build here
├── CLAUDE.md                  @AGENTS.md and the skill
├── package.json  pnpm-lock.yaml  pnpm-workspace.yaml  vite.config.ts  tsconfig.json  .gitignore
├── .claude/skills/run-eval/SKILL.md   runs the eval, says what failed and why
├── scripts/daily.ts           pnpm daily: every Kanzlei once, a non-zero exit on a failure
├── src/
│   ├── app.html  app.d.ts
│   ├── lib/
│   │   ├── types.ts           Email, Akte, Item, Frist
│   │   ├── components/        after the mock is agreed
│   │   └── server/            never reaches the browser
│   │       ├── connector.ts   loadInbox(kanzlei): the simulated inbox, Graph-shaped
│   │       └── briefing/      akte extract frist heute items llm pipeline rank schema verify
│   └── routes/
│       ├── +page.svelte       pick a Kanzlei
│       └── [kanzlei]/
│           ├── +layout.server.ts   reads this Kanzlei's briefing.json
│           ├── +layout.svelte      the left pane: the briefing
│           ├── +page.server.ts     the "Tageslauf starten" action, then a redirect
│           ├── +page.svelte        the right pane, nothing picked
│           └── [email]/+page.svelte   the right pane: the email, quotes marked
├── data/                      fake only
│   ├── kanzlei-berlin/        kanzlei.json, akten.json, inbox/*.json
│   ├── kanzlei-muenchen/      the same
│   └── replay/                the 28 recorded LLM replies
├── docs/                      BRIEF RESEARCH DESIGN DECISIONS HOW-IT-WAS-BUILT ROADMAP
└── tests/                     *.test.ts
    └── eval/                  gold.json gold.ts scorers.ts run-eval.ts
```

- Generated and gitignored: `data/<kanzlei>/out/briefing.json`.
- `daily.ts` finds a Kanzlei by its `kanzlei.json`, because `data/` also holds `replay/`.
- Tests live in `tests/`, not next to the code. The user chose this, with the eval beside them.

## Data

Fake only. No real names, dates or amounts.

- `kanzlei-berlin`: Arbeitsrecht, Berlin holidays. `kanzlei-muenchen`: Mietrecht and Zivilrecht, Bayern holidays.
- One lawyer per Kanzlei, 14 emails each, 28 in total. The 11 traps in `RESEARCH.md` section 4 are split across them.
- `kanzlei.json`: name, Land, domain, the lawyer, `simulated_today`. The briefing date comes from here, not the calendar.
- `akten.json` per Akte: `aktenzeichen`, `az_gericht`, `gericht`, `mandant`, `gegenseite`, `fristen[]`, `last_contact`,
  and the new `termine[]`. Read-only. It stands in for the Kanzleisoftware. No code writes it.
- `termine[]` needs no LLM, because a hearing today is a calendar fact, not new mail. One Kanzlei gets a Termin for
  the next day. The other shows the empty state.
- The emails use Microsoft Graph's fields: `id`, `from.emailAddress`, `receivedDateTime`, `subject`, `body.content`,
  and `channel` (`bea` or `email`). Beyond Graph: beA is simulated as mail. The README says so.

## Pipeline

```
data/<kanzlei>/inbox/*.json   loadInbox, the connector
  → extract   one LLM call per email: the facts, each with a quote
  → verify    code: is the quote in that email? If not, the fact is "unsicher"
  → frist     code: §§ 187, 188 BGB, § 222 Abs. 2 ZPO, the Land's holidays
  → rank      code: the tiers, then "Heute"
  → data/<kanzlei>/out/briefing.json
  → SvelteKit reads it. The button starts the same run.
```

### Grounding

1. One LLM call per email. Structured output: a summary, the sender role, the Aktenzeichen, the Fristen (trigger, trigger
   date as written, length as written), a Frist event, an urgent request, a Wiedervorlage, Termine, an injection flag.
2. Code checks each quote: a normalised substring of that email's body. A failed check keeps the fact and marks it
   "unsicher", with the email link. It is not dropped.
3. Code computes each end date, with the Land's holidays typed in by hand. Every date shows "berechnet, bitte prüfen".
   No trigger date: "Frist nicht berechenbar, Zustellungsdatum prüfen", never a guess.
4. A beA court mail with no Zustellung date adds "eEB abgeben. Fristende 16.11. nur wenn eEB heute" (my reasoning).

### When a run fails

- An email that cannot be read shows "nicht gelesen", and the coverage line counts it. The other emails still run.
  The spike stops the whole run here. This is new behaviour, so it gets a test first.
- A missing recorded reply is not "nicht gelesen". The replay is broken, so the Kanzlei fails.
- A Kanzlei that fails does not stop the others. `pnpm daily` exits non-zero at the end, and also on an email not read.
- No run yet: the page says so. It does not look like an empty inbox.

### Replay

- JSON files in `data/replay/`, keyed by a hash of the model, the prompt version, the system prompt, the schema and the prompt.
- A changed prompt or model gives a new key. A missing reply fails loudly (`MissingFixture`).
- `BRIEFING_LIVE=1` calls the model and records the reply.

## Port the spike

The order: `verify`, `frist`, `schema`, `connector`, `akte`, `items`, `rank`, `extract`, `llm`, `pipeline`, the eval.

The gate: every spike test for a ported module has a TypeScript twin, and `pnpm eval` gives the spike's numbers on the
same replies. A one-time comparison of the full item list with the spike's also passes, because the table does not score
`raw_end`, `hint`, `reason`, `relative` or the order in a tier. Nothing new is added before that. The spike's tests:
`uv run pytest` there gives 142 passed.

**Re-key the replies by a script, with no live call.** Each record holds `email_id`, `model` and `prompt_version`.
Compute the new key in TypeScript and rename each file by its `email_id`. Do not reproduce Python's JSON bytes. Sort keys
recursively, and pin one key in a test. `test_no_stale_fixture` (its twin) catches a bad re-key.

**Twins for tests of code that goes away:**

| Spike test | Twin |
|---|---|
| `test_akte.py:60-84`: isolation, the plain folder name | With `akte`. Spy on the `fs` calls in place of Python's audit hook. |
| `test_rank.py:49`: an injection does not change the tier | With `rank` |
| `test_render.py:94`: quote marks merge on overlap, and escape | A pure function beside `findSpan`. Svelte text nodes, never `{@html}`. |
| `test_verify.py:59-77`: `find_span` | With `verify` |
| `test_frist.py`: the holiday table against the `holidays` package | Export the expected sets once from Python to a JSON file |
| `test_metrics.py` | No twin. Metrics wait (`ROADMAP.md`). |

**Traps in the port.** They come from reading the code. None has been run in TypeScript yet.

- Dates: UTC-date arithmetic only. No local `Date` methods.
- The German day: `Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Berlin'})`. Add a test with an email at 23:30 UTC.
- Months: `setMonth` overflows, Python clamps. Add 31 Jan + 1 month gives 28 Feb by hand.
- Regexes: JS `\b` is ASCII-only, and Python's is Unicode-aware. Test "März" and the weekdays.
- Case folding: JS has no `casefold`, so `toLowerCase` keeps `ß`. Fold `ß` to `ss`, as Python does. Use one function on both quote and body. Test `STRASSE` against `Straße`.
- Invalid dates: `Date.UTC(2026, 1, 31)` gives 3 March with no error. Python raises. Fail loudly. Test it.
- Modulo: `-3 % 7` is `-3` in JS and `4` in Python. Test a weekday sent on a day that is not a Monday.
- The prompt's `Received:` line: Python writes `2026-11-02T06:41:00+00:00`, and `toISOString()` writes `.000Z`. Match Python. Before the re-key, compare the system prompt, the schema and the prompt with Python's for all 28 emails, because a re-key hides a difference.
- Quote spans: JS strings iterate UTF-16 units. Test an astral character and a combining sequence.
- The `[kanzlei]` URL value is a trust boundary. Check it as `inbox.py:25` does.
- `pnpm daily` and `pnpm eval` run outside Vite: plain `node`, which runs `.ts` itself. Use relative imports with `.ts` in `src/lib/server/`, and no `$app/*` or `$env`.
- Resolve `data/` from `import.meta.url`, not `process.cwd()`.
- The button's action must redirect, so a reload does not start a second run.

## Eval

`tests/eval/gold.json` holds hand labels. Code scorers only, each with a planted-fault test: it scores a perfect
prediction full and fails a wrong one.

| Scorer | Spike, both Kanzleien |
|---|---|
| Frist recall, must-see | 7/7 |
| Frist recall, all | 9/9 |
| End-date accuracy | 9/9 |
| Quote validity | 106/106 |
| Must-see in the top 3 | 6/6 |
| Tier accuracy | 28/28 |
| Akte match | 28/28 |
| Injection flagged, not in top 3 | 1/1 |
| Schema validity | 28/28 |

One live run, n=14 per Kanzlei, on emails written for this. It is directional, not a benchmark. The emails are cleaner
than a real inbox: no attachments, no HTML, no long threads.

## Privacy: what production needs

The demo uses only fake data, so § 203 StGB and § 43e BRAO are not touched. A real Kanzlei needs (`RESEARCH.md` section 3):

1. A contract in text form with the AI provider that binds it to confidentiality (§ 43e Abs. 3 BRAO).
2. A DPA with SCCs (Art. 28 DSGVO).
3. EU processing (for example Bedrock EU inference) or a local model.
4. Zero data retention. Logs hold IDs and counts only.
5. Mandant consent where § 43e Abs. 5 BRAO applies, or anonymisation first.
6. A DPIA.
7. AI literacy training (Art. 4 KI-VO).
8. The lawyer checks every Frist. The briefing says so on every date.

## Build order

Agree each step with the user before it starts.

1. Scaffold, copy the data, `git init`. Check: `pnpm check` and `pnpm test` pass.
2. Port with the tests, in the order above, and the `run-eval` skill. Check: the gate above.
3. Tests first: `connector.ts`, `termine[]`, "Heute", the hearing rule, a date the court set, "nicht gelesen" and the
   coverage line, `daily.ts`. Check: `pnpm test`, `pnpm eval`, and `pnpm daily` exits non-zero on a planted failure.
4. The mock, then the screens. A visual choice: 3 variants behind a temporary switch. Check: the user, in the UI.
5. The docs: the README, `AGENTS.md`, `DECISIONS.md`, `HOW-IT-WAS-BUILT.md`. The first cuts, if scope must shrink: screen
   polish, then docs length. Never the tests or the eval.

`HOW-IT-WAS-BUILT.md` is a summary: the steps, what the AI suggested, what the user rejected and why. No session history
goes in the repo. The brief asks for it, so the README says in one line that this is a summary, and why.

Stale text to fix in step 5, in `DECISIONS.md`: the "chat box" row ("one static HTML file"), the Claude Code plugin row
("a script"), the n8n row ("seven-step pipeline"), and the build's choices "No JavaScript" and `pyproject.toml`.

## Stop points

The builder stops here and hands the user one thing to check. Work continues after the user's go.

| Stop | What the user checks |
|---|---|
| Before each build step | The step's design, in 3 lines or fewer |
| Step 2, after `verify` and `frist` | These two are the port's main risk. The user runs `pnpm test` and reads the list of twins. |
| Step 2, at its end | `pnpm eval` against the spike's table in "Eval". Any number that differs is shown with its cause. |
| Step 3, after the hearing rule and a date the court set | The diff of the two gold labels (`b11`, `m09`), and the new order |
| Step 3, at its end | `pnpm daily`, and the content of "Heute" for both Kanzleien |
| Step 4, before any screen | The mock. Then each screen, in the UI. |
| Step 5, before anything goes to Florian | The README and `HOW-IT-WAS-BUILT.md`, read in full |

Stop at once, at any step, for one of these:

- A prompt, schema or model change. It forces a live re-record of all 28 replies.
- A spike test or a gold label that must change for the port to pass, other than `b11` and `m09`.
- A new dependency.
- A failure with no known cause after two tries.
- Anything that sends data outside this computer. Push and the invite to Florian wait for the user's go.

## Open

- A Termin in a mail that also has a Frist (`b02`): one item or two. Default: one item, the Termin shown on it.
- Three bands ("Heute", "Fristen", "Rest") or six visible tiers. Decided at the mock.
