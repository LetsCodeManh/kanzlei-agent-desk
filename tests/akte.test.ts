import { describe, expect, it } from 'vitest';
import { loadInbox } from '#lib/server/connector.ts';
import { loadAkten, matchAkte, soon } from '#lib/server/briefing/akte.ts';
import type { Akte, Email } from '#lib/types.ts';

const KANZLEIEN = ['kanzlei-berlin', 'kanzlei-muenchen'];
const AKTEN: Akte[] = [
	{
		aktenzeichen: 'B-26-101',
		az_gericht: '12 Ca 3456/26',
		gericht: '',
		mandant: { name: '', address: 'm@example.com' },
		gegenseite: { name: '', addresses: ['g@example.org'] },
		fristen: [],
		termine: [],
		last_contact: '2026-10-20'
	},
	{
		aktenzeichen: 'B-26-102',
		az_gericht: '',
		gericht: '',
		mandant: { name: '', address: 'n@example.com' },
		gegenseite: { name: '', addresses: [] },
		fristen: [{ what: 'x', end: '2026-11-09', noted_from: 'Mail' }],
		termine: [],
		last_contact: '2026-10-20'
	}
];

function email(body = '', senderAddress = 'x@example.net', subject = ''): Email {
	return {
		id: 'e',
		channel: 'email',
		received: '2026-11-02T08:00:00+00:00',
		receivedDay: '2026-11-02',
		senderName: '',
		senderAddress,
		subject,
		body
	};
}

describe('matchAkte', () => {
	it.each([
		['Az. 12 Ca 3456/26, bitte', undefined, undefined, 'B-26-101'],
		['Az. 12 Ca  3456/26', undefined, undefined, 'B-26-101'],
		['', undefined, 'Ihr Zeichen B-26-102', 'B-26-102'],
		['Az. 112 Ca 3456/26', undefined, undefined, null],
		['Az. 12 Ca 3456/267', undefined, undefined, null],
		['', 'g@example.org', undefined, 'B-26-101'],
		['B-26-102', 'm@example.com', undefined, 'B-26-102'], // the Aktenzeichen wins over the sender
		['nichts', undefined, undefined, null]
	])('body %j, sender %j, subject %j gives %j', (body, sender, subject, expected) => {
		expect(matchAkte(email(body, sender, subject), AKTEN)?.aktenzeichen ?? null).toBe(expected);
	});

	it('sees a boundary as Python does: a letter like ä is part of a word', () => {
		expect(matchAkte(email('äB-26-101'), AKTEN)).toBeNull();
		expect(matchAkte(email('B-26-101ä'), AKTEN)).toBeNull();
	});

});

describe('soon', () => {
	it('takes an Akte Frist within a week, and an overdue one', () => {
		expect(soon(AKTEN[1], '2026-11-02').map((f) => f.daysLeft)).toEqual([7]);
		expect(soon(AKTEN[1], '2026-11-01')).toEqual([]);
		expect(soon(AKTEN[1], '2026-11-12').map((f) => f.daysLeft)).toEqual([-3]);
	});

	it('fails loudly on a date in the Akte that does not exist', () => {
		const akte = { ...AKTEN[1], fristen: [{ what: 'x', end: '2026-02-31', noted_from: 'Mail' }] };
		expect(() => soon(akte, '2026-11-02')).toThrow(/no such date/);
	});
});

describe('isolation between Kanzleien', () => {
	const pairs = [KANZLEIEN, [...KANZLEIEN].reverse()];

	it.each(pairs)('no email of %s matches an Akte of %s', (mine, other) => {
		const otherAkten = loadAkten(other);
		expect(loadInbox(mine).emails.filter((e) => matchAkte(e, otherAkten))).toEqual([]);
	});

	it('has no Aktenzeichen in both', () => {
		const [a, b] = KANZLEIEN.map(
			(k) => new Set(loadAkten(k).flatMap((akte) => [akte.aktenzeichen, akte.az_gericht]).filter(Boolean))
		);
		expect([...a].filter((z) => b.has(z))).toEqual([]);
		expect(a.size).toBeGreaterThan(0);
	});
});
