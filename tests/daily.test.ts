import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DATA } from '#lib/server/connector.ts';
import { runDaily } from '#lib/server/briefing/pipeline.ts';

const temp: string[] = [];
afterEach(() => {
	for (const dir of temp.splice(0)) rmSync(dir, { recursive: true });
	vi.restoreAllMocks();
});

/** A copy of both fake Kanzleien. Their replies are found by key, in the real replay folder. */
function copyOfData(): string {
	const data = mkdtempSync(join(tmpdir(), 'daily-test-'));
	temp.push(data);
	for (const kanzlei of ['kanzlei-berlin', 'kanzlei-muenchen']) {
		cpSync(join(DATA, kanzlei), join(data, kanzlei), { recursive: true, filter: (from) => !from.endsWith('/out') });
	}
	return data;
}

const briefing = (data: string, kanzlei: string) => join(data, kanzlei, 'out/briefing.json');

describe('runDaily', () => {
	it('writes each briefing, and passes', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const data = copyOfData();
		expect(await runDaily(data)).toBe(true);
		const written = JSON.parse(readFileSync(briefing(data, 'kanzlei-muenchen'), 'utf-8'));
		expect(written.coverage).toEqual({ read: 14, notRead: 0 });
		expect(written.heute.termine).toHaveLength(1);
		expect(written.items.length).toBeGreaterThan(0);
		expect(written).not.toHaveProperty('rows');
		expect(existsSync(briefing(data, 'kanzlei-berlin'))).toBe(true);
		expect(log).toHaveBeenCalledWith('kanzlei-berlin: 14 E-Mails gelesen, 0 nicht gelesen');
	});

	it('a Kanzlei that fails does not stop the next one, and the run fails at the end', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const data = copyOfData();
		writeFileSync(join(data, 'kanzlei-berlin/akten.json'), '{ not json');
		expect(await runDaily(data)).toBe(false);
		expect(existsSync(briefing(data, 'kanzlei-berlin'))).toBe(false);
		expect(existsSync(briefing(data, 'kanzlei-muenchen'))).toBe(true);
		expect(error.mock.calls[0][0]).toMatch(/^kanzlei-berlin: /);
	});

	it('an email not read keeps the briefing, says so in it, and fails the run', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const data = copyOfData();
		writeFileSync(join(data, 'kanzlei-berlin/inbox/broken.json'), '{ not json');
		expect(await runDaily(data)).toBe(false);
		const written = JSON.parse(readFileSync(briefing(data, 'kanzlei-berlin'), 'utf-8'));
		expect(written.coverage).toEqual({ read: 14, notRead: 1 });
		expect(written.notRead).toEqual([{ id: 'broken', sender: '', subject: '', reason: 'Datei nicht lesbar' }]);
		expect(log).toHaveBeenCalledWith('kanzlei-berlin: 14 E-Mails gelesen, 1 nicht gelesen: broken');
	});

	it('finding no Kanzlei is a failure, not an empty success', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const data = mkdtempSync(join(tmpdir(), 'daily-test-'));
		temp.push(data);
		expect(await runDaily(data)).toBe(false);
		expect(error).toHaveBeenCalled();
	});
});
