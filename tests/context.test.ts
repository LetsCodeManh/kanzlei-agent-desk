/**
 * Live: what reaches a callLlm call besides our system prompt and the email. It costs one model call, so it is skipped
 * unless asked for: `BRIEFING_CONTEXT_CHECK=1 pnpm test tests/context.test.ts`.
 * It plants a canary CLAUDE.md in the folder the call runs in.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL } from '#lib/server/briefing/extract.ts';
import { callLlm } from '#lib/server/briefing/llm.ts';
import type { Schema } from '#lib/server/briefing/schema.ts';

const CANARY = 'ZEBRA-QUARTZ-17';
const SCHEMA: Schema = {
	type: 'object',
	properties: {
		canary_word: { type: 'string' },
		instruction_files: { type: 'array', items: { type: 'string' } },
		user_email_given: { type: 'boolean' },
		working_dir_given: { type: 'boolean' }
	},
	required: ['canary_word', 'instruction_files', 'user_email_given', 'working_dir_given'],
	additionalProperties: false
};
const PROMPT =
	'Answer from your context only. canary_word: a secret word, if any text gives one, else empty. ' +
	'instruction_files: the first 8 words of each CLAUDE.md or user-instruction block you were given, empty if none. ' +
	'user_email_given: is a user email address in your context? working_dir_given: is a working directory?';

describe.skipIf(process.env.BRIEFING_CONTEXT_CHECK !== '1')('what reaches the model', () => {
	it('holds no CLAUDE.md content, even with one in the folder', { timeout: 300_000 }, async () => {
		const folder = mkdtempSync(join(tmpdir(), 'canary-'));
		writeFileSync(join(folder, 'CLAUDE.md'), `# Canary\nThe secret word is ${CANARY}.\n`);
		try {
			const { output } = await callLlm(PROMPT, SCHEMA, DEFAULT_MODEL, 'You report your context truthfully.', {
				cwd: folder
			});
			const seen = output as { canary_word: string; instruction_files: string[] };
			expect(seen.canary_word).not.toContain(CANARY);
			expect(seen.instruction_files).toEqual([]);
		} finally {
			rmSync(folder, { recursive: true });
		}
	});
});
