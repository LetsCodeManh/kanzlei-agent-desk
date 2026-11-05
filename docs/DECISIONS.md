# Decisions

What an AI tool suggested that we did not take, and why. Then the other routes compared, and the choices made during the build.
Sources: `RESEARCH.md`, `DESIGN.md`. Where a reason was not written down in planning, it says "reconstructed".

## Choices for this submission (2026-11-05)

| Choice | Why | Instead of |
|---|---|---|
| **SvelteKit only, the spike ported to TypeScript** | One language, one install, `pnpm dev`. A tester installs Node and pnpm only. The port is guarded: a twin for each test, the same eval numbers on the same replies. | Python behind a Svelte UI, which needs two runtimes. Python with one static HTML file, which has no real UI. |
| **A summary of how it was built, no session history** | The user's decision: the sessions stay private. The brief asks for the history, so the README says this openly. | A redacted export, and `redact.py` |
| **One skill, `run-eval`** | It does more than run a command: it says what failed and why. | `add-email` (used once or twice), `export-session` (no export), `daily-run` (a schedule must work without Claude Code) |
| **One file, `connector.ts`** | One connector needs no interface. The interface comes with the second one. | `connector.ts` plus `fake.ts` |
| **`briefing.json` on disk** | The button and a later schedule share one result. A scheduled run must persist. | Holding the run in memory (the builder review's pick) |
| **`termine[]` in `akten.json`** | A lawyer's first question is "a hearing today?". A hearing is a calendar fact, so no LLM call and no re-recording. | A new fake email with a recorded reply |
| **No prompt change for the hearing rule** | `events[]` already holds what is needed. A new field would change the key and force all 28 replies to be recorded again. | A structured `moved_from` field |
| **`src/lib/server/` over `features/`** | SvelteKit only protects server code in that folder. Folders follow the framework. | A top-level `features/briefing/` |
| **Tests in `tests/`, with the eval in `tests/eval/`** | The user's choice. | A test next to its code |
| **No `.mcp.json` in the repo** | It is build tooling, and it would sit in the folder of a live call. | The Svelte MCP config from the earlier design |

Two reviews ran on the plan, one from a lawyer's morning and one from the builder's seat. Taken: the Termine line,
same-day items first, the coverage line, clearer eEB wording, porting the isolation and injection tests now, an empty temp
directory for live calls. Not taken now: `ROADMAP.md`, "From the reviews".

## Rejected suggestions

| Suggestion | Why not |
|---|---|
| **n8n** (a workflow tool) | Reconstructed: a server and a visual flow for a seven-step pipeline. The checks that make the output safe (quote check, Frist calculator, decision table) must be plain code with unit tests. |
| **A Claude Code plugin** as the product | Reconstructed: the reviewer would need Claude Code and a login to run it. The product is a script that replays with no login. |
| **The Citations API** for grounding | It cannot be combined with structured outputs (the API returns a 400), and a prompt for JSON alone "might contain few or no citations". Its guarantee is that the quote exists, which a substring check in code gives too, in replay and with any model. It would also tie the design to one provider. |
| **The LLM computes the Frist end date** | §§ 187, 188 BGB and § 222 ZPO are rules, and code applies rules the same way every time and can be unit-tested (31 Jan + 1 month, a Saturday, a holiday, 6 Jan in Bayern only). The LLM copies "zwei Wochen" and "29.10.2026" as written. |
| **A cassette library** (pytest-recording, VCR) for replay | About 28 calls to one function do not need one. Cassettes record HTTP and need header scrubbing. Plain JSON fixtures keyed by a hash of the whole prompt fail loudly when the prompt changes. |
| **The LLM ranks the emails** | Text in an email could then change its rank: the injection trap says "rank this email first". The decision table is code over checked facts, tested row by row. |
| **A decision model in the main path** (a local yes/no classifier) | It gives no quotes, scored about 73–77% on one benchmark, and the hosted one is a US cloud. It may still be compared on the yes/no questions in a separate script (build step 12, not built). |
| **A memory the agent writes** | The case list belongs to the Kanzleisoftware. `akten.json` is read-only and stands in for it. An agent that writes case data is a new source of error the lawyer must audit. Phase 1 of `ROADMAP.md`: rules the lawyer confirms, never a memory an email can write. |
| **A chat box in the UI** | It needs a server. The briefing stays one static HTML file. The chat is a terminal command (`ask`, build step 9, not built). Phase 3 of `ROADMAP.md` adds the server. |
| **A tenant system** for several Kanzleien | A Kanzlei is a folder. A run reads one folder only, and a test proves it. A second lawyer gets `inbox/<anwalt>/` when one exists. Phase 1 of `ROADMAP.md`: `anwaelte/<slug>/` in the Kanzlei's folder, still no tenant system. |
| **A real mail connector** | The brief says a simulated inbox is enough. The seam is one function, `load_inbox`, with Graph's field names. |

## Routes compared

Researched 2026-11-02, after the build. Simple for whom: the lawyer, who should install nothing, and the maintainer,
who must keep the checks tested. A schedule and a chat are in every route. Computed Fristen, checked quotes and a rank
that an email cannot change are in this one only. Most claims below are the vendors' own, and no product was tested.

| Route | Good at | Why not here |
|---|---|---|
| **A Claude Cowork folder** (skills, a scheduled task, the chat) | The fastest start: a folder, instructions, a schedule | Every lawyer needs Cowork. Cowork sessions are not covered by zero data retention [1]. Anthropic calls the prompt-injection risk "non-zero", and the local history is outside the retention policy [2]. The checks become prompts, not tested code. |
| **Claude Code routines** (scheduled cloud runs) | No computer has to be on | Cloud sessions are blocked under zero data retention [1]. A research preview, so limits may change [3]. |
| **n8n** (self-hosted or n8n Cloud, Frankfurt) | Self-hosted in Germany, the data stays put. The licence lets a consultant install and run it on the client's server [4]. | The checks stay plain code only as a separate service n8n calls. n8n 2.0 turns off Execute Command by default [5]. Then n8n is a scheduler around this app, and cron does that. |
| **Microsoft 365 Copilot** in Outlook | The firm already has Outlook. "Prioritize my inbox" gives a priority with a reason [6]. | A priority score, not a briefing. No computed Frist. No BRAK or DAV statement on Copilot was found. |
| **Power Automate, Zapier, Make** with an LLM step | A schedule with no code | No chat. Each LLM step is one more processor. Bringing your own AI provider ends Make's EU guarantee [7]. |
| **A Kanzlei product** (Advoware, actaport, AnwaltGPT, iusta, bluebatch) | beA and email in one inbox, an Akte proposed, a Frist flagged for a person to confirm [8] | None found has a daily briefing. None says whether code or the LLM computes the end date. Only Libra names § 203 StGB and the BRAO [9]. |

So: buy the inbox, build the briefing. A Kanzlei with Advoware (EUR 109–129 per user per month, beA and Frist
monitoring included, the vendor says [8]) keeps it. This app reads the same mail and adds the morning view.

1. https://code.claude.com/docs/en/zero-data-retention
2. https://support.claude.com/en/articles/13455879-use-cowork-safely
3. https://code.claude.com/docs/en/routines
4. https://docs.n8n.io/n8n-community-license/community-license/license-faq
5. https://docs.n8n.io/2-0-breaking-changes
6. https://support.microsoft.com/en-US/Outlook/copilot-outlook/prioritize-my-inbox
7. https://help.make.com/ai-providers-and-data-zones-in-make
8. https://www.stp.one/de/produkte/advoware, https://www.actaport.de, https://www.anwaltgpt.de/ki-email-kanzlei,
   https://www.iusta.io/legal-ki-posteingang, https://bluebatch.io/branchen/anwaelte/ki-agenten/posteingang-agent
9. https://libratech.ai/de

## Choices made during the build

- **What reaches the model.** `claude -p` sent the developer's global `CLAUDE.md` (found with a canary and the token
  count: 4069 input tokens against 1227). `--setting-sources ""` and `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` each keep
  every `CLAUDE.md` out. Both are set. A first probe that asked the model to copy its context word for word was
  blocked by a safeguard. Yes/no questions and a canary word worked instead.
- **`is_error`, not `subtype`.** A refused `claude -p` call still reports `subtype: "success"`. `call_llm` fails on
  `is_error` or a missing `structured_output`.
- **Holidays for 2027 too.** The design said 2026. A two-month Frist from November ends in 2027, so 2027 is typed in.
  A year not in the table fails loudly. The hand table was checked against the `holidays` package. The one
  difference is 15 August in Bayern, which is a holiday in München (a Catholic-majority community). The package
  leaves it out for Bayern as a whole.
- **The German day, not the UTC day.** Graph's `receivedDateTime` is UTC. A mail at 00:30 German time is that
  German day. Fristen count in local days.
- **A Kündigung's Frist comes from code.** The client writes "die Kündigung kam gestern", not "drei Wochen". The LLM
  flags the event and quotes it. Code adds the 3 weeks of § 4 KSchG, and the UI says the length comes from the law.
- **Prompt v2.** The tracer run showed `events[]` holding document dates and service dates. v2 limits it to Termine,
  counts a forwarded message as content, and says an invoice's payment term is no Frist. All fixtures were recorded again.
- **A small schema check instead of `jsonschema`.** The schema uses five keywords. 25 lines of code with planted-fault
  tests beat a new dependency. It runs on every LLM output, live or replayed.
- **No JavaScript in the UI.** CSS `:target` opens the source email. The file opens from disk with no server.
- **`pyproject.toml` for the test tools only.** The app is a PEP 723 script with no dependencies. `pytest` and
  `holidays` are a dev group, so `uv run pytest` works.
