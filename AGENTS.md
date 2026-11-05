# How to build here

A morning briefing built from a lawyer's inbox, for a take-home assignment. Read `docs/BRIEF.md`, then `docs/DESIGN.md`.
`docs/DESIGN.md` holds the workflow, the rules, the build order and the port's traps. `docs/DECISIONS.md` holds why.
Everything after this submission: `docs/ROADMAP.md`. Do not build from it.

## Commands

```sh
pnpm install
pnpm dev        # the app, on localhost:5173
pnpm test       # Vitest, replay mode, no login
pnpm check      # svelte-check
pnpm eval       # the scorers on the recorded replies, no login
```

## Rules

- The LLM reads and quotes. Code checks, computes and decides. Never let the LLM output a Frist end date or a rank.
- Fake data only. No real names, dates or amounts, and no secrets in code, logs or commits.
- Agree each build step with the user before it starts.
- Write a test first for new behaviour. Name non-trivial code's checks in the hand-back.
- Tests live in `tests/`, and the eval in `tests/eval/`.
- A changed prompt, schema or model changes the replay key. All 28 replies must then be recorded live. Ask first.
- Put no folder or file in the repo before its step starts. A later idea goes in `docs/ROADMAP.md`.
- Server code goes in `src/lib/server/`. It must never reach the browser.
- The port's reference is the spike at `../morning-briefing`. It does not ship. Copy no Python into this repo.
- `data/*/out/` is generated. `akten.json` is read-only for all code.
- Give no time estimates.

## Add a fake email

1. Add `data/<kanzlei>/inbox/<id>.json`, with Microsoft Graph's fields.
2. Add its label to `tests/eval/gold.json`.
3. Record its reply with `BRIEFING_LIVE=1`. A missing reply fails loudly.
