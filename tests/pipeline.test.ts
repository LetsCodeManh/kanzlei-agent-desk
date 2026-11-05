import { afterEach, describe, expect, it, vi } from 'vitest';
import { extract } from '#lib/server/briefing/extract.ts';
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
	it('fails loudly, and names the email, on a reply that breaks the schema', async () => {
		vi.mocked(extract).mockImplementation(async (email, options) => {
			const reply = await real.extract(email, options);
			if (email.id !== 'b03') return reply;
			return { ...reply, output: { ...(reply.output as object), end_date: '2026-11-12' } };
		});
		await expect(run('kanzlei-berlin', { live: false })).rejects.toThrow(/^b03: the LLM output breaks the schema: \$: unexpected end_date/);
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
