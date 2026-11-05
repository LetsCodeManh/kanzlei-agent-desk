---
name: run-eval
description: Runs the eval on the recorded replies, compares it with the agreed table, and says what failed and why. Use when the user says "run the eval", "pnpm eval", "did the score change", or after a change to the pipeline, the rules or the gold labels.
---

# Run the eval

1. Run `pnpm eval`. It replays the recorded replies. It needs no login and calls no model.
2. Compare each row with the table in `docs/DESIGN.md`, section "Eval". Say "matches" or name each row that differs.
3. For each row that differs, find the cause before you report it:
   - Read the scorer in `tests/eval/scorers.ts`.
   - In `shots/`, write a throwaway script that prints `predictions(await run(kanzlei))` next to `tests/eval/gold.json`.
   - Name the email ID, the value the run gave, the value gold holds, and the code that decides it.
4. An error `No recorded reply for email` means the prompt, the schema, the model or the email changed. Report it. Do not record.

## Do not

- Do not set `BRIEFING_LIVE=1` without the user's go. It calls the model, costs money and overwrites the recorded replies.
- Do not change a gold label to make a row pass. Stop and ask the user. `docs/DESIGN.md`, "Stop points", names the two agreed changes.
- Do not read a full score as proof of quality. It is n=14 per Kanzlei, on emails written for this.
