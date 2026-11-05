import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { germanDay, kanzleiDir, listKanzleien, loadInbox, loadKanzlei } from '#lib/server/connector.ts';

const temp: string[] = [];
afterEach(() => {
	for (const dir of temp.splice(0)) rmSync(dir, { recursive: true });
});

function message(over: Record<string, unknown> = {}) {
	return {
		id: 'a1',
		channel: 'email',
		receivedDateTime: '2026-11-02T06:41:00Z',
		from: { emailAddress: { name: 'Erika', address: 'Erika@Example.COM' } },
		subject: 's',
		body: { contentType: 'text', content: 'b' },
		...over
	};
}

/** A data folder with one Kanzlei, `k`, and these messages. */
function dataWith(...messages: unknown[]): string {
	const data = mkdtempSync(join(tmpdir(), 'connector-test-'));
	temp.push(data);
	mkdirSync(join(data, 'k/inbox'), { recursive: true });
	writeFileSync(
		join(data, 'k/kanzlei.json'),
		JSON.stringify({
			name: 'n',
			land: 'BE',
			domain: 'd.example',
			anwalt: { name: 'a', address: 'a@d.example' },
			simulated_today: '2026-11-02'
		})
	);
	messages.forEach((m, i) => writeFileSync(join(data, `k/inbox/${i}.json`), JSON.stringify(m)));
	return data;
}

describe('germanDay', () => {
	it('is the German day, not the UTC day', () => {
		expect(germanDay('2026-10-30T23:30:00+00:00')).toBe('2026-10-31');
		expect(germanDay('2026-10-30T22:30:00+00:00')).toBe('2026-10-30');
	});

	it('follows summer time: two hours ahead of UTC', () => {
		expect(germanDay('2026-07-01T21:59:00+00:00')).toBe('2026-07-01');
		expect(germanDay('2026-07-01T22:00:00+00:00')).toBe('2026-07-02');
	});
});

describe('kanzleiDir', () => {
	it.each(['../kanzlei-berlin', 'kanzlei-berlin/../kanzlei-muenchen', 'Kanzlei', '', 'kanzlei-berlin\n'])(
		'refuses %j: a Kanzlei name is a plain folder name',
		(name) => {
			expect(() => kanzleiDir(name)).toThrow(/must match/);
		}
	);
});

describe('loadInbox', () => {
	it('maps Graph fields, with the sender in lower case and Python-style time', () => {
		const [email] = loadInbox('k', dataWith(message())).emails;
		expect(email).toEqual({
			id: 'a1',
			channel: 'email',
			received: '2026-11-02T06:41:00+00:00',
			receivedDay: '2026-11-02',
			senderName: 'Erika',
			senderAddress: 'erika@example.com',
			subject: 's',
			body: 'b'
		});
	});

	it('sorts by time, then by id', () => {
		const data = dataWith(
			message({ id: 'c', receivedDateTime: '2026-11-02T08:00:00Z' }),
			message({ id: 'b', receivedDateTime: '2026-11-02T07:00:00Z' }),
			message({ id: 'a', receivedDateTime: '2026-11-02T08:00:00Z' })
		);
		expect(loadInbox('k', data).emails.map((e) => e.id)).toEqual(['b', 'a', 'c']);
	});

	it.each([
		['a missing subject', { ...message({ id: 'bad' }), subject: undefined }, /missing subject/],
		['a date that does not exist', message({ id: 'bad', receivedDateTime: '2026-02-31T06:41:00Z' }), /no such date/],
		['an HTML body', message({ id: 'bad', body: { contentType: 'html', content: '<p>b</p>' } }), /only text bodies/]
	])('on %s: that file is not read, the others are', (_, bad, detail) => {
		const { emails, notRead } = loadInbox('k', dataWith(message({ id: 'good' }), bad));
		expect(emails.map((e) => e.id)).toEqual(['good']);
		expect(notRead).toEqual([{ id: '1', sender: '', subject: '', reason: 'Datei nicht lesbar', detail: expect.stringMatching(detail) }]);
	});

	it('a file that is not JSON is not read, the others are', () => {
		const data = dataWith(message({ id: 'good' }));
		writeFileSync(join(data, 'k/inbox/broken.json'), '{ not json');
		const { emails, notRead } = loadInbox('k', data);
		expect(emails.map((e) => e.id)).toEqual(['good']);
		expect(notRead.map((n) => n.id)).toEqual(['broken']);
	});

	it('a duplicate id still fails the whole inbox: links would open the wrong email', () => {
		expect(() => loadInbox('k', dataWith(message(), message()))).toThrow(/Duplicate email ids/);
	});
});

describe('listKanzleien', () => {
	it('finds a Kanzlei by its kanzlei.json, so replay/ and a stray folder are not one', () => {
		const data = dataWith();
		mkdirSync(join(data, 'replay'));
		expect(listKanzleien(data)).toEqual(['k']);
	});
});

describe('loadKanzlei', () => {
	it('fails loudly on a Land with no holidays', () => {
		const data = dataWith();
		const path = join(data, 'k/kanzlei.json');
		writeFileSync(path, JSON.stringify({ name: 'n', land: 'XX', domain: 'd', anwalt: { name: 'a', address: 'a' }, simulated_today: '2026-11-02' }));
		expect(() => loadKanzlei('k', data)).toThrow(/land/);
	});
});
