/** A run reads one Kanzlei's folder only. Every `node:fs` call is watched, in place of Python's audit hook. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '#lib/server/briefing/pipeline.ts';

const touched = vi.hoisted(() => [] as string[]);

vi.mock('node:fs', async (original) => {
	const fs = await original<Record<string, unknown>>();
	const watched = Object.entries(fs).map(([name, value]) => [
		name,
		typeof value === 'function' && !/^[A-Z]/.test(name)
			? (...args: unknown[]) => {
					touched.push(String(args[0]));
					return (value as (...a: unknown[]) => unknown)(...args);
				}
			: value
	]);
	return { ...Object.fromEntries(watched), default: Object.fromEntries(watched) };
});

const KANZLEIEN = ['kanzlei-berlin', 'kanzlei-muenchen'];

describe('a run', () => {
	beforeEach(() => {
		touched.length = 0;
	});

	it.each([KANZLEIEN, [...KANZLEIEN].reverse()])('of %s touches no file of %s', async (mine, other) => {
		await run(mine, { live: false });
		expect(touched.some((path) => path.includes(`/data/${mine}/`))).toBe(true); // the spy sees the run's own reads
		expect(touched.filter((path) => path.includes(`/data/${other}`))).toEqual([]);
	});

	it('refuses a name that is not a plain folder name, before it touches a file', async () => {
		await expect(run('../kanzlei-berlin', { live: false })).rejects.toThrow(/must match/);
		expect(touched).toEqual([]);
	});
});
