/** Replay: every email has a recorded reply for the default model, no record is stale, gold covers every email. */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_MODEL,
	extract,
	hashKey,
	MissingFixture,
	PROMPT_VERSION,
	promptFor,
	REPLAY,
	replayKey,
	SCHEMA,
	SYSTEM
} from '#lib/server/briefing/extract.ts';
import { callLlm } from '#lib/server/briefing/llm.ts';
import { loadInbox } from '#lib/server/connector.ts';
import { GOLD } from './eval/gold.ts';

// No test here may reach a model. A test that expects a call says what it returns.
vi.mock('#lib/server/briefing/llm.ts', () => ({ callLlm: vi.fn() }));

const KANZLEIEN = ['kanzlei-berlin', 'kanzlei-muenchen'];
const EMAILS = KANZLEIEN.flatMap((kanzlei) => loadInbox(kanzlei).emails);

function records() {
	return readdirSync(REPLAY).map((file) => ({
		key: file.replace(/\.json$/, ''),
		...JSON.parse(readFileSync(join(REPLAY, file), 'utf-8'))
	}));
}

describe('the fake data', () => {
	it.each(KANZLEIEN)('%s has 14 emails', (kanzlei) => {
		expect(loadInbox(kanzlei).emails).toHaveLength(14);
	});
});

describe('replay', () => {
	it('replays every email, with no call to a model', async () => {
		for (const email of EMAILS) {
			const { output } = await extract(email, { live: false });
			expect((output as { sender_role: { value: string } }).sender_role.value).toBeTruthy();
		}
		expect(callLlm).not.toHaveBeenCalled();
	});

	it('has no stale record: each file is the key of its email', () => {
		const current = EMAILS.map((email) => replayKey(email, DEFAULT_MODEL)).sort();
		const recorded = records()
			.filter((record) => record.model === DEFAULT_MODEL)
			.map((record) => record.key)
			.sort();
		expect(recorded).toEqual(current);
	});

	it('fails loudly on a changed email', async () => {
		const changed = { ...EMAILS[0], body: `${EMAILS[0].body} ` };
		const reply = extract(changed, { live: false });
		await expect(reply).rejects.toThrow(MissingFixture);
		await expect(reply).rejects.toThrow(/Record it with BRIEFING_LIVE=1/);
	});

	it('pins one key: a changed hash or a changed prompt breaks it', () => {
		const b01 = EMAILS.find((email) => email.id === 'b01');
		expect(b01 && replayKey(b01, DEFAULT_MODEL)).toBe('b0d334762b96f677d545fce9');
	});
});

describe('the key', () => {
	it('changes with the system prompt', () => {
		const key = (system: string) => hashKey(DEFAULT_MODEL, PROMPT_VERSION, system, SCHEMA, 'p');
		expect(key(`${SYSTEM} `)).not.toBe(key(SYSTEM));
	});

	it('changes with another model', () => {
		expect(replayKey(EMAILS[0], 'claude-opus-5-5')).not.toBe(replayKey(EMAILS[0], DEFAULT_MODEL));
	});
});

describe('live', () => {
	it('records the reply, and replay then reads it back', async () => {
		const replay = mkdtempSync(join(tmpdir(), 'replay-test-'));
		const result = {
			output: { a: 'ä' },
			meta: { model: 'm', duration_ms: 1, cost_usd: 0, input_tokens: 1, output_tokens: 1 }
		};
		vi.mocked(callLlm).mockResolvedValueOnce(result);
		try {
			expect(await extract(EMAILS[0], { model: 'm', live: true, replay })).toEqual(result);
			expect(vi.mocked(callLlm).mock.lastCall?.slice(0, 4)).toEqual([promptFor(EMAILS[0]), SCHEMA, 'm', SYSTEM]);
			expect(await extract(EMAILS[0], { model: 'm', live: false, replay })).toEqual(result);
			const [file] = readdirSync(replay);
			expect(file).toBe(`${replayKey(EMAILS[0], 'm')}.json`);
			expect(JSON.parse(readFileSync(join(replay, file), 'utf-8'))).toMatchObject({
				email_id: EMAILS[0].id,
				model: 'm',
				prompt_version: PROMPT_VERSION
			});
		} finally {
			rmSync(replay, { recursive: true });
			vi.mocked(callLlm).mockReset();
		}
	});
});

describe('the gold labels', () => {
	const emails = (kanzlei: string) => Object.values(GOLD[kanzlei].emails);

	it.each(KANZLEIEN)('%s labels every email and no other', (kanzlei) => {
		const ids = loadInbox(kanzlei).emails.map((email) => email.id).sort();
		expect(Object.keys(GOLD[kanzlei].emails).sort()).toEqual(ids);
	});

	it.each(KANZLEIEN)('%s has at most 3 must-see', (kanzlei) => {
		const mustSee = emails(kanzlei).filter((email) => email.must_see).length;
		expect(mustSee).toBeGreaterThanOrEqual(1);
		expect(mustSee).toBeLessThanOrEqual(3);
	});

	it('covers the 11 traps', () => {
		// docs/RESEARCH.md section 4. "A Saturday or a Berlin holiday" is two tags here.
		expect(new Set(KANZLEIEN.flatMap((kanzlei) => emails(kanzlei).flatMap((email) => email.traps)))).toEqual(
			new Set([
				'bea_no_zustellung_date',
				'termin_and_frist',
				'saturday_end',
				'kuendigung_gestern',
				'frist_met',
				'newsletter_frist',
				'vu_zustellung_stated',
				'forwarded_twice',
				'holiday_end',
				'quoted_thread_date',
				'injection',
				'relative_date'
			])
		);
	});
});
