# How to build here

A morning briefing built from a lawyer's inbox, for a take-home assignment. Read `docs/BRIEF.md`, then `docs/DESIGN.md`.
`docs/DESIGN.md` holds the workflow, the rules, the build order and the port's traps. `docs/DECISIONS.md` holds why.
Everything after this submission: `docs/ROADMAP.md`. Do not build from it.

## Commands

```sh
pnpm install
pnpm dev        # the app, on localhost:5173
pnpm test       # Vitest, replay mode, no login. It cannot go live
pnpm check      # svelte-check
pnpm eval       # the scorers on the recorded replies, no login
pnpm daily      # every Kanzlei once, writes data/<kanzlei>/out/briefing.json, non-zero on a failure

BRIEFING_CONTEXT_CHECK=1 pnpm test tests/context.test.ts   # one model call: the canary
node scripts/record-drafts.ts   # model calls: one reply draft per email that has none, in data/replay-drafts/
```

## Rules

- The LLM reads and quotes. Code checks, computes and decides. Never let the LLM output a Frist end date or a rank.
- Fake data only. No real names, dates or amounts, and no secrets in code, logs or commits.
- Agree each build step with the user before it starts.
- Write only the necessary tests: the spike's twins, the traps in `docs/DESIGN.md`, a silently wrong Frist date, the `claude` call, isolation.
  A surviving planted fault is no reason for a test by itself.
- A hand-back says what a result means for the user, not which tests ran. `pnpm eval` is the result the user reads.
- Tests live in `tests/`, and the eval in `tests/eval/`.
- `tests/eval/unseen/` is the record of one live run, not a gate. Do not tune a prompt or the Frist wording to it.
- A changed prompt, schema or model changes the replay key. All 28 replies must then be recorded live. Ask first.
- The reply drafts have their own prompt and folder. A change to the draft prompt or an email means recording those drafts again. Ask first.
- Use the Svelte MCP server and skills for any `.svelte` file. The user checks the screens in the UI.
- Put no folder or file in the repo before its step starts. A later idea goes in `docs/ROADMAP.md`.
- Server code goes in `src/lib/server/`. It must never reach the browser.
- The port's reference is the spike at `../morning-briefing`. It does not ship. Copy no Python into this repo.
- `data/*/out/` is generated. `akten.json` is read-only for all code.
- Give no time estimates.

## Add a fake email

1. Add `data/<kanzlei>/inbox/<id>.json`, with Microsoft Graph's fields.
2. Add its label to `tests/eval/gold.json`.
3. Record its reply with `BRIEFING_LIVE=1`, after you ask. A live run calls the model for every email and overwrites those replies.
   A missing reply fails loudly.
4. If it wants a reply draft, record it with `node scripts/record-drafts.ts <id>`, after you ask. A missing draft fails `tests/draft.test.ts`.
