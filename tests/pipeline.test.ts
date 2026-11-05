import { afterEach, describe, expect, it, vi } from 'vitest';
import { extract, MissingFixture } from '#lib/server/briefing/extract.ts';
import { LlmError } from '#lib/server/briefing/llm.ts';
import { run } from '#lib/server/briefing/pipeline.ts';

vi.mock('#lib/server/briefing/extract.ts', async (original) => ({
	...(await original<object>()),
	extract: vi.fn()
}));

const real = await vi.importActual<{ extract: typeof extract }>('#lib/server/briefing/extract.ts');

afterEach(() => {
	vi.mocked(extract).mockReset();
	vi.unstubAllEnvs();
});

describe('run', () => {
	it('a reply that breaks the schema: that email is not read, and counted. The others run.', async () => {
		vi.mocked(extract).mockImplementation(async (email, options) => {
			const reply = await real.extract(email, options);
			if (email.id !== 'b03') return reply;
			return { ...reply, output: { ...(reply.output as object), end_date: '2026-11-12' } };
		});
		const result = await run('kanzlei-berlin', { live: false });
		expect(result.notRead).toEqual([
			expect.objectContaining({ id: 'b03', reason: 'Antwort des Modells ungültig', detail: expect.stringMatching(/unexpected end_date/) })
		]);
		expect(result.notRead[0].sender).not.toBe('');
		expect(result.notRead[0].subject).not.toBe('');
		expect(result.coverage).toEqual({ read: 13, notRead: 1 });
		expect(result.items.flatMap((item) => item.emails.map((e) => e.id))).not.toContain('b03');
	});

	it('a failed model call: that email is not read, and counted. The others run.', async () => {
		vi.mocked(extract).mockImplementation(async (email, options) => {
			if (email.id === 'b03') throw new LlmError('claude -p timed out');
			return real.extract(email, options);
		});
		const result = await run('kanzlei-berlin', { live: false });
		expect(result.notRead.map((n) => [n.id, n.reason])).toEqual([['b03', 'Modell nicht erreichbar']]);
		expect(result.coverage).toEqual({ read: 13, notRead: 1 });
	});

	it('a missing recorded reply fails the Kanzlei: the replay is broken, not the email', async () => {
		vi.mocked(extract).mockRejectedValue(new MissingFixture('No recorded reply'));
		await expect(run('kanzlei-berlin', { live: false })).rejects.toThrow(MissingFixture);
	});

	it('a bug fails the Kanzlei: only a known failure becomes "nicht gelesen"', async () => {
		vi.mocked(extract).mockRejectedValue(new TypeError('x is not a function'));
		await expect(run('kanzlei-berlin', { live: false })).rejects.toThrow(TypeError);
	});

	it('a clean run: every email counted as read, and "Heute" built', async () => {
		vi.mocked(extract).mockImplementation((email, options) => real.extract(email, options));
		const result = await run('kanzlei-muenchen', { live: false });
		expect(result.coverage).toEqual({ read: 14, notRead: 0 });
		expect(result.notRead).toEqual([]);
		expect(result.heute.termine).toHaveLength(1);
	});

	it('live: runs at most 4 calls at a time, and keeps the inbox order', async () => {
		let running = 0;
		let most = 0;
		const started: string[] = [];
		vi.mocked(extract).mockImplementation(async (email) => {
			started.push(email.id);
			running++;
			most = Math.max(most, running);
			await new Promise((resolve) => setTimeout(resolve, 1));
			running--;
			return real.extract(email, { live: false });
		});
		const result = await run('kanzlei-berlin', { live: true });
		expect(most).toBe(4);
		expect(started).toHaveLength(14);
		expect(result.rows.map((row) => row.email.id)).toEqual(started);
	});

	it('takes BRIEFING_LIVE=1 as live, and nothing else', async () => {
		vi.mocked(extract).mockImplementation((email) => real.extract(email, { live: false }));
		const liveFlags = () => vi.mocked(extract).mock.calls.map(([, options]) => options?.live);

		vi.stubEnv('BRIEFING_LIVE', '1');
		await run('kanzlei-berlin');
		expect(new Set(liveFlags())).toEqual(new Set([true]));
		vi.mocked(extract).mockClear();

		vi.stubEnv('BRIEFING_LIVE', 'true');
		await run('kanzlei-berlin');
		expect(new Set(liveFlags())).toEqual(new Set([false]));
	});
});
