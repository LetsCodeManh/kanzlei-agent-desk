# How it was built

A summary, not the session history. The brief asks for the history. I kept it private, because the sessions ran in my private
workspace, which holds unrelated personal data. "Where I steered" gives each turn with the date and time of my message, in
plain words, not quoted. `git log` is the full record of the code: each commit says what changed and what was checked.

I used Claude Code for all of it: research, design, code, tests and reviews. The Svelte MCP server and skills were build aids.
`.claude/skills/run-eval` is the one skill in this repo.

## The steps

**1 Nov: research, design, a spike.** From the brief, Claude researched the sources (`RESEARCH.md`) and we agreed the design: the LLM
quotes, code checks, computes and ranks. Then a Python spike: 142 tests, the 28 fake emails, one recorded live run, the eval.
Its job was to see what Claude builds. It is not in this repo.

**2 Nov: too much, in hindsight.** Research agents compared Cowork, routines, n8n, Copilot, no-code tools and 19 Kanzlei products
(`DECISIONS.md`, "Routes compared"). I wrote the roadmap with Claude. Then I designed a bigger product: a desk per lawyer, a
decision model, our own ops screens.

**5 Nov: the cut.** The desks were too big for this brief. I cut to the morning briefing and moved the rest to `ROADMAP.md`, with
gates. Claude picked Python to keep the tested code. I reversed that the same day: one language and a real UI.

**5 Nov: the port, in four steps, each agreed first.**

1. The scaffold and the data.
2. The spike's modules in TypeScript, with its tests as twins. The gate: the same numbers on the same replies. `pnpm eval` matched on
   every row. A one-time comparison of the full item list found 0 differences, and 22,054 comparisons of `verify` and `frist`
   found 0 too. No new feature came before this passed.
3. What was new: "Heute", the hearing rule, a date the court set, "nicht gelesen", `pnpm daily`.
4. The screens: 3 variants at a mock with real content. I picked three bands, then the code. Once I saw them I asked for one day page,
   then two tabs, Heute and Postfach, with a month, from my design system.
5. The Postfach as a mail client: simulated answers, icons, a modal, a recorded reply draft, and the reader's and the Eingang's look, each from 3 variants in the real screen. Then the connectors in a modal, with adding simulated.
6. Whether it holds: I asked if it was foolproof. Claude's answer was no, because a Frist the model leaves out stayed silent. So came a code check for a court's mail, a second live run of the 28, and 10 emails written by a separate agent that had not seen the prompt. The README has the results, and `tests/eval/unseen/` the 10.


## Where I steered

My messages are short. My rules and the session briefs turn them into exact steps. These are the turns, my message in plain words.

| When (UTC−5) | What I said | What changed |
|---|---|---|
| Sun 1 Nov, 19:09 | Not a build session yet. Plan first, from the assessment criteria. | Research before any code |
| Sun 1 Nov, 19:13 | Could this run in n8n instead? | n8n compared, then rejected (`DECISIONS.md`) |
| Sun 1 Nov, 19:18 | The simplest form: a web app laid out like an email client. Is that already too much? | The mail client layout |
| Mon 2 Nov, 09:41 | The workflow must be simple to maintain, build and launch. | The bar for every choice after |
| Mon 2 Nov, 10:36 | A `prompt-history/` folder the research suggested, not one I chose. | Every top-level folder is my call |
| Mon 2 Nov, 10:48 | So it becomes a Kanzlei agent desk. That might be too much. | The bigger design, cut on 5 Nov |
| Thu 5 Nov, 09:46 | The full desk is too big. Keep the structure, finish only the morning briefing. | The cut, the rest to `ROADMAP.md` |
| Thu 5 Nov, 10:22 | We use SvelteKit, so why keep Python? | SvelteKit only, the spike ported |
| Thu 5 Nov, 10:26 | Two reviews: one from a lawyer's morning, one from the builder's seat. | Two review agents (`DECISIONS.md`) |
| Thu 5 Nov, 10:47 | Why `tsx`, if we have SvelteKit? | Plain `node` |
| Thu 5 Nov, 11:21 | I could not tell what each test protects. Keep only the necessary ones. | 226 tests cut to 171 |
| Thu 5 Nov, 12:35 | No hierarchy, and where does the lawyer connect the email? "Tageslauf starten" means nothing. | The screens rebuilt |
| Thu 5 Nov, 14:45 | Two tabs: the inbox and today. | Heute and Postfach |
| Thu 5 Nov, 15:26 | One scroller for the whole timeline. A click on the calendar jumps to the date. | The timeline |
| Thu 5 Nov, 16:18 | Icons, not word buttons: people know them. Reply and forward in a modal. | Icons and the modal |
| Thu 5 Nov, 21:03 | Next we check if it is foolproof. I need to be sure. | The court mail check, the unseen set |

## What the AI suggested and I rejected

| Suggestion | My call | Why |
|---|---|---|
| Python for the submission: 142 tests carry over, and a port rewrites tested code | SvelteKit only, ported | One language, one install, a UI. The twins and the eval gate guard the port. |
| `tsx` to run the scripts outside Vite | Plain `node` | I asked why. Node runs `.ts` itself, so no new dependency. |
| A large test suite: 226 tests, with more lines than the source | Cut to 171 | I read `pnpm eval`, and I could not tell what each check protects. Kept: the spike's twins, the port's traps, tests against a silently wrong Frist date, the `claude` call, Kanzlei isolation. The later steps added their own, so 262 today. |
| A test for each planted fault that survived | Cut 3 of the 5 | A surviving fault is no reason for a test by itself. |
| An `add-email` skill and a separate `fake.ts` | Cut | Used once or twice. One connector needs no interface. |
| A `prompt-history/` folder in the spike, from a line in the research | Not in this repo, and every top-level folder is now my call | A folder the research suggested, not one I chose. |
| "Heute" as a page that scrolls, so the month's tiles cannot cut a Frist | The window's height on a desktop | I wanted the whole screen at once. Claude then made the tiles count what does not fit. |
| The timeline shows the day picked | All dates in one scroller, and a click moves it | I want to see what comes next without clicking through days. |
| The answer form at the top of the email, with word buttons | A modal and icons | I looked at the first build: good, not there yet. People know the icons, and the words were too long to read. |
| A letter in a serif, or two columns, for the open email | The mail client | Three variants in the real screen. "Similar to an email provider" was my word from the start. |
| "Zu tun" over "Heute tun" under the heading "Heute", which stutters | Kept "Heute tun" for now | My call. It was already a change from "Anrufen", Claude's proposal: a Wiedervorlage is a check, not a call. |

The design-level rejections are in `DECISIONS.md`: n8n, the Citations API, the LLM computing a Frist or a rank, a memory the agent
writes, and others. Two reviews of the plan ran, one from a lawyer's morning and one from the builder's seat. Neither is a real
lawyer. What they gave is in `DECISIONS.md`, and what waits is in `ROADMAP.md`.

## What went wrong, and what caught it

| What | Caught by | The fix |
|---|---|---|
| The eval read 100% while a court's moved hearing sat in collapsed "Rest", and a Frist with 2 days left ranked behind one with 21. My gold label was part of it. | Reading the briefing as a lawyer (Claude's read), not the eval | "Heute", and the hearing rule. Two gold labels changed, in the open. |
| Claude merged "a date the court set" into the hearing rule, in chat and in `DESIGN.md`. They are different rules. | Reading the notes back at the end of the session | `DESIGN.md` corrected. |
| `claude -p` sent my global `CLAUDE.md` with every email: 4069 input tokens against 1227. | A planted canary and the token count | Both switches and an empty folder. `tests/context.test.ts` repeats it live. |
| `BRIEFING_LIVE=1 pnpm test` would have called the model and overwritten the 28 replies. | Reading the port | `vite.config.ts` turns it off for tests. The canary has its own switch. |
| `DESIGN.md` said `ß` stays `ß`, which broke a spike test's twin. | The twin | The port folds `ß` to `ss`, as Python does. |
| A fixed path to `data/` gave a 500 on every page after `pnpm build`. | A build check | `data/` is found by walking up. |
| A failed run's message went away on reload. | Testing the failed state | A failed run leaves a mark beside the briefing until a run passes. |

## Rules I set for the AI

- Agree each build step before it starts. Stop at once for a prompt, schema or model change, a gold label, a new dependency, a failure
  with no known cause after two tries, or anything that leaves this computer.
- A changed prompt means all 28 replies are recorded again, so nothing recorded changes without my go.
- No empty structure. A folder exists only when its step starts.
- Only the necessary tests, and a hand-back says what a result means for me, not which tests ran.

## What nobody has checked

- No lawyer has read it. The legal reasoning comes from the sources in `RESEARCH.md`.
- The 28 recorded replies come from the spike's run on 1 Nov. The port's own live calls: `b02`, which gave the same facts as its recorded reply, the canary, which passed,
  a second run of the 28 and the 10 unseen emails, each to its own folder, and the reply drafts.
- The planted-fault run was not repeated after the tests were cut. Some code is now untested on purpose: `claude` exiting before it reads
  the prompt, a reply that is not JSON, most loud failures on bad files.
