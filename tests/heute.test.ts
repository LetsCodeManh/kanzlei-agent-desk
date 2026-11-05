import { describe, expect, it } from 'vitest';
import { buildHeute, coverageLine } from '#lib/server/briefing/heute.ts';
import { blankItem } from '#lib/server/briefing/items.ts';
import { run } from '#lib/server/briefing/pipeline.ts';
import { rank } from '#lib/server/briefing/rank.ts';
import type { Akte, Email, Frist, Item, Role } from '#lib/types.ts';

const TODAY = '2026-11-02';

function email(id: string): Email {
	return {
		id,
		channel: 'email',
		received: '2026-11-02T08:00:00+00:00',
		receivedDay: TODAY,
		senderName: '',
		senderAddress: '',
		subject: '',
		body: ''
	};
}

function frist(over: Partial<Frist>): Frist {
	return {
		what: 'Stellungnahme',
		trigger: 'zustellung',
		quote: 'q',
		quoteOk: true,
		status: 'found',
		lengthText: '',
		emailId: 'e',
		source: 'email',
		end: null,
		rawEnd: null,
		relative: false,
		reason: '',
		hint: '',
		daysLeft: null,
		...over
	};
}

function item(role: Role, over: Partial<Item> = {}): Item {
	return { ...blankItem(), emails: [email('e')], role, akte: 'A-1', ...over };
}

function akte(termine: Akte['termine']): Akte {
	return {
		aktenzeichen: 'A-1',
		az_gericht: '1 C 1/26',
		gericht: '',
		mandant: { name: 'Theo Theorie', address: '' },
		gegenseite: { name: '', addresses: [] },
		fristen: [],
		termine,
		last_contact: TODAY
	};
}

const termin = (date: string, time = '09:30') => ({ what: 'Verhandlung', date, time, room: 'Saal 1' });
const heuteOf = (...items: Item[]) => buildHeute(rank(items), [], TODAY);

describe('"Heute" on the two fake inboxes', () => {
	const ids = (lines: { emailIds: string[] }[]) => lines.map((line) => line.emailIds.join('+'));

	it('Berlin: no Termin, the same-day items, b01 and b03 to check, and the Akte\'s Replik', async () => {
		const { heute } = await run('kanzlei-berlin', { live: false });
		expect(heute.termine).toEqual([]);
		expect(ids(heute.anrufen)).toEqual(['b07', 'b08']);
		expect(heute.pruefen.map((line) => line.text)).toEqual([
			'B-26-101: Frist nicht berechenbar, Zustellungsdatum prüfen',
			'B-26-103: Kündigungsschutzklage (§ 4 KSchG) bis 19.11. (relative Angabe, prüfen)' // "gestern"
		]);
		expect(heute.bald.map((line) => line.text)).toEqual(['B-26-105: Replik auf die Klageerwiderung bis 04.11.']);
	});

	it('München: tomorrow\'s hearing, the same-day items, the two near Fristen, and no injection mail', async () => {
		const { heute } = await run('kanzlei-muenchen', { live: false });
		expect(heute.termine.map((line) => line.text)).toEqual([
			'Morgen 09:30: Mündliche Verhandlung, 172 C 3141/26 (Theo Theorie), Sitzungssaal B 214'
		]);
		expect(ids(heute.anrufen)).toEqual(['m07', 'm08']);
		expect(heute.pruefen).toEqual([]);
		expect(ids(heute.bald)).toEqual(['', 'm06']); // the Akte's Frist, 1 day, then m06, 4 days
		expect(ids([...heute.anrufen, ...heute.pruefen, ...heute.bald]).join()).not.toContain('m05');
	});
});

describe('Termine', () => {
	const lines = (...dates: string[]) => buildHeute([], [akte(dates.map((date) => termin(date)))], TODAY).termine;

	it('holds today and tomorrow, not yesterday and not the day after', () => {
		expect(lines('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04').map((line) => line.text.split(' ')[0])).toEqual([
			'Heute',
			'Morgen'
		]);
	});

	it('sorts by day, then time', () => {
		const heute = buildHeute([], [akte([termin('2026-11-03', '08:00'), termin(TODAY, '14:00'), termin(TODAY, '09:00')])], TODAY);
		expect(heute.termine.map((line) => line.text.split(':')[0])).toEqual(['Heute 09', 'Heute 14', 'Morgen 08']);
	});

	it('fails loudly on a date that does not exist', () => {
		expect(() => lines('2026-02-31')).toThrow(/no such date/);
	});
});

describe('Anrufen', () => {
	it('holds a client\'s urgent request and a Wiedervorlage today', () => {
		const heute = heuteOf(item('client', { urgent: true, summary: 'a' }), item('internal', { wvToday: true, summary: 'b' }));
		expect(heute.anrufen.map((line) => line.text).sort()).toEqual(['a', 'b']);
	});

	it('takes an unsure role as a client: rank higher, never lower', () => {
		expect(heuteOf(item('other', { urgent: true, roleSure: false })).anrufen).toHaveLength(1);
	});

	it('leaves out an unknown sender\'s demand: text in an email cannot put it here', () => {
		expect(heuteOf(item('other', { urgent: true })).anrufen).toEqual([]);
		expect(heuteOf(item('opponent', { urgent: true })).anrufen).toEqual([]);
	});
});

describe('Prüfen and Bald', () => {
	const near = (daysLeft: number, end = '2026-11-05') => frist({ end, rawEnd: end, daysLeft });

	it('a Frist with no end date is in Prüfen, with its reason', () => {
		const heute = heuteOf(item('court', { fristen: [frist({ reason: 'Frist nicht berechenbar' })] }));
		expect(heute.pruefen[0].text).toBe('A-1: Frist nicht berechenbar');
		expect(heute.bald).toEqual([]);
	});

	it('Bald holds 7 days left, not 8', () => {
		expect(heuteOf(item('court', { fristen: [near(7)] })).bald).toHaveLength(1);
		expect(heuteOf(item('court', { fristen: [near(8)] })).bald).toEqual([]);
	});

	it('a Frist already past comes first, and says so', () => {
		const heute = heuteOf(
			item('court', { akte: 'A-1', fristen: [near(1, '2026-11-03')] }),
			item('client', { akte: 'A-2', fristEvent: true, fristen: [near(-3, '2026-10-30')] })
		);
		expect(heute.bald.map((line) => line.text)).toEqual([
			'A-2: Stellungnahme, abgelaufen am 30.10.',
			'A-1: Stellungnahme bis 03.11.'
		]);
	});

	it('a date the court set shows that date, not the moved one', () => {
		const stated = frist({ trigger: 'stated_date', rawEnd: '2026-11-07', end: '2026-11-09', daysLeft: 5 });
		expect(heuteOf(item('court', { fristen: [stated] })).bald[0].text).toBe('A-1: Stellungnahme bis 07.11.');
	});

	it('a relative date is in Bald when near, in Prüfen when not', () => {
		const rel = (daysLeft: number) => frist({ end: '2026-11-06', rawEnd: '2026-11-06', relative: true, daysLeft });
		expect(heuteOf(item('opponent', { fristen: [rel(4)] })).bald[0].text).toBe(
			'A-1: Stellungnahme bis 06.11. (relative Angabe, prüfen)'
		);
		const far = heuteOf(item('opponent', { fristen: [rel(10)] }));
		expect(far.bald).toEqual([]);
		expect(far.pruefen[0].text).toBe('A-1: Stellungnahme bis 06.11. (relative Angabe, prüfen)');
	});

	it('leaves out a Frist from an unknown sender, as the tiers do: a newsletter\'s "letzte Frist"', () => {
		const heute = heuteOf(item('other', { fristen: [near(1)] }), item('other', { fristen: [frist({ reason: 'x' })] }));
		expect(heute.bald).toEqual([]);
		expect(heute.pruefen).toEqual([]);
	});

	it('keeps an unsure sender\'s Frist: rank higher, never lower', () => {
		expect(heuteOf(item('other', { roleSure: false, fristen: [near(1)] })).bald).toHaveLength(1);
	});

	it('keeps an internal Frist, though its tier is 6', () => {
		expect(heuteOf(item('internal', { fristen: [near(1)] })).bald).toHaveLength(1);
	});
});

describe('the coverage line', () => {
	it.each([
		[14, 0, '14 E-Mails gelesen, 0 nicht gelesen'],
		[1, 13, '1 E-Mail gelesen, 13 nicht gelesen']
	])('%i read, %i not', (read, notRead, line) => {
		expect(coverageLine({ read, notRead })).toBe(line);
	});
});
