import { describe, expect, it } from 'vitest';
import { coverageLine } from '#lib/format.ts';
import { buildDay } from '#lib/server/briefing/day.ts';
import { blankItem } from '#lib/server/briefing/items.ts';
import { run } from '#lib/server/briefing/pipeline.ts';
import { rank } from '#lib/server/briefing/rank.ts';
import type { Akte, DayRow, DayScreen, Email, Frist, Item, Role } from '#lib/types.ts';

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
const dayOf = (...items: Item[]) => buildDay(rank(items), [], TODAY);

describe('the day on the two fake inboxes', () => {
	const ids = (rows: DayRow[]) => rows.map((row) => row.emailIds.join('+'));

	it('Berlin: no Termin, the same-day tasks, b01 and b03 to check, and the Akte\'s Replik', async () => {
		const { day } = await run('kanzlei-berlin', { live: false });
		expect(day.termineSoon).toEqual([]);
		expect(ids(day.aufgaben)).toEqual(['b07', 'b08']);
		expect(ids(day.pruefen)).toEqual(['b01', 'b03']);
		expect(day.pruefen[0].date).toBeNull();
		expect(day.pruefen[0].notes[0]).toBe('Frist nicht berechenbar, Zustellungsdatum prüfen');
		expect(day.pruefen[1].date).toBe('Do 19.11.'); // "gestern"
		expect(day.bald.map((row) => [row.title, row.date])).toEqual([['Replik auf die Klageerwiderung', 'Mi 04.11.']]);
	});

	it('München: tomorrow\'s hearing, the same-day tasks, the two near Fristen, and no injection mail', async () => {
		const { day } = await run('kanzlei-muenchen', { live: false });
		expect(day.termineSoon.map((row) => [row.title, row.sub, row.when])).toEqual([
			['Mündliche Verhandlung', '09:30 Uhr · 172 C 3141/26 (Theo Theorie), Sitzungssaal B 214 · aus der Akte', 'morgen']
		]);
		expect(day.termineSoon[0].emailIds).toEqual([]);
		expect(ids(day.aufgaben)).toEqual(['m07', 'm08']);
		expect(day.pruefen).toEqual([]);
		expect(ids(day.bald)).toEqual(['', 'm06']); // the Akte's Frist, 1 day, then m06, 4 days
		expect(ids([...day.aufgaben, ...day.pruefen, ...day.bald]).join()).not.toContain('m05');
	});
});

describe('every item lands somewhere', () => {
	const rows = (day: DayScreen) => Object.values(day).flat();

	it.each(['kanzlei-berlin', 'kanzlei-muenchen'])('%s: every email and every Akte Frist has a row', async (kanzlei) => {
		const { day, items } = await run(kanzlei, { live: false });
		const shown = rows(day);
		const opened = new Set(shown.flatMap((row) => row.emailIds));
		for (const item of items) {
			for (const { id } of item.emails) expect(opened).toContain(id);
			if (item.emails.length === 0) expect(shown.map((row) => row.title)).toContain(item.fristen[0].what);
		}
	});

	it('an item with nothing to show, or kept out of the Fristen, is in the rest', () => {
		const near = frist({ end: '2026-11-03', rawEnd: '2026-11-03', daysLeft: 1 });
		const day = dayOf(item('other'), item('client'), item('other', { fristen: [near] }));
		expect(day.rest).toHaveLength(3);
	});
});

describe('Termine', () => {
	const rows = (...dates: string[]) => buildDay([], [akte(dates.map((date) => termin(date)))], TODAY).termineSoon;

	it('holds today and tomorrow, not yesterday and not the day after', () => {
		expect(rows('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04').map((row) => row.when)).toEqual(['heute', 'morgen']);
	});

	it('sorts by day, then time', () => {
		const day = buildDay([], [akte([termin('2026-11-03', '08:00'), termin(TODAY, '14:00'), termin(TODAY, '09:00')])], TODAY);
		expect(day.termineSoon.map((row) => `${row.when} ${row.sub.slice(0, 5)}`)).toEqual(['heute 09:00', 'heute 14:00', 'morgen 08:00']);
	});

	it('fails loudly on a date that does not exist', () => {
		expect(() => rows('2026-02-31')).toThrow(/no such date/);
	});
});

describe('Heute tun', () => {
	it('holds a client\'s urgent request and a Wiedervorlage today', () => {
		const day = dayOf(
			item('client', { urgent: true, emails: [{ ...email('a'), senderName: 'Tom' }] }),
			item('internal', { wvToday: true, summary: 'Wiedervorlage: Akte prüfen', emails: [email('b')] })
		);
		expect(day.aufgaben.map((row) => row.title).sort()).toEqual(['Akte prüfen', 'Tom antworten']);
	});

	it('takes an unsure role as a client: rank higher, never lower', () => {
		expect(dayOf(item('other', { urgent: true, roleSure: false })).aufgaben).toHaveLength(1);
	});

	it('leaves out an unknown sender\'s demand: text in an email cannot put it here', () => {
		expect(dayOf(item('other', { urgent: true })).aufgaben).toEqual([]);
		expect(dayOf(item('opponent', { urgent: true })).aufgaben).toEqual([]);
	});

	it('keeps the same row id when the list moves, so a tick survives a new read', () => {
		const first = item('client', { urgent: true, emails: [email('x')] });
		const before = dayOf(first).aufgaben[0].id;
		expect(dayOf(item('client', { urgent: true, emails: [email('w')] }), first).aufgaben.map((row) => row.id)).toContain(before);
	});
});

describe('the ledger of Fristen', () => {
	const near = (daysLeft: number, end = '2026-11-05') => frist({ end, rawEnd: end, daysLeft });

	it('a Frist with no end date is in "Datum prüfen", with its reason and no date', () => {
		const day = dayOf(item('court', { fristen: [frist({ reason: 'Frist nicht berechenbar' })] }));
		expect(day.pruefen[0].notes).toEqual(['Frist nicht berechenbar']);
		expect(day.pruefen[0].date).toBeNull();
		expect(day.bald).toEqual([]);
	});

	it('the next 7 days hold 7 days left, not 8', () => {
		expect(dayOf(item('court', { fristen: [near(7)] })).bald).toHaveLength(1);
		const eight = dayOf(item('court', { fristen: [near(8)] }));
		expect(eight.bald).toEqual([]);
		expect(eight.spaeter).toHaveLength(1);
	});

	it('a Frist already past comes first, and says so', () => {
		const day = dayOf(
			item('court', { akte: 'A-1', fristen: [near(1, '2026-11-03')] }),
			item('client', { akte: 'A-2', fristEvent: true, fristen: [near(-3, '2026-10-30')] })
		);
		expect(day.bald.map((row) => [row.date, row.when])).toEqual([
			['Fr 30.10.', 'abgelaufen'],
			['Di 03.11.', 'morgen']
		]);
	});

	it('a date the court set shows that date, not the moved one', () => {
		const stated = frist({ trigger: 'stated_date', rawEnd: '2026-11-07', end: '2026-11-09', daysLeft: 5 });
		expect(dayOf(item('court', { fristen: [stated] })).bald[0].date).toBe('Sa 07.11.');
	});

	it('a relative date is in the next 7 days when near, in "Datum prüfen" when not, and says to check it', () => {
		const rel = (daysLeft: number) => frist({ end: '2026-11-06', rawEnd: '2026-11-06', relative: true, daysLeft });
		expect(dayOf(item('opponent', { fristen: [rel(4)] })).bald[0].notes).toEqual(['Relative Angabe, bitte prüfen']);
		const far = dayOf(item('opponent', { fristen: [rel(10)] }));
		expect(far.bald).toEqual([]);
		expect(far.pruefen[0].date).toBe('Fr 06.11.');
		expect(far.pruefen[0].notes).toEqual(['Relative Angabe, bitte prüfen']);
	});

	it('leaves out a Frist from an unknown sender, as the tiers do: a newsletter\'s "letzte Frist"', () => {
		const day = dayOf(item('other', { fristen: [near(1)] }), item('other', { fristen: [frist({ reason: 'x' })] }));
		expect(day.bald).toEqual([]);
		expect(day.pruefen).toEqual([]);
	});

	it('keeps an unsure sender\'s Frist: rank higher, never lower', () => {
		expect(dayOf(item('other', { roleSure: false, fristen: [near(1)] })).bald).toHaveLength(1);
	});

	it('keeps an internal Frist, though its tier is 6', () => {
		expect(dayOf(item('internal', { fristen: [near(1)] })).bald).toHaveLength(1);
	});
});

describe('a hearing from a court\'s mail', () => {
	const hearing = (what: string, date_text: string) => ({ what, date_text, quote: 'q', oldDate: null });

	it('takes a time from `what` only if the email holds it', () => {
		const held = { ...email('e'), body: 'Termin um 10:30 Uhr' };
		const row = (emails: Email[]) =>
			dayOf(item('court', { emails, events: [hearing('Güteverhandlung, Saal 2, 10:30 Uhr', 'am 04.12.2026')] })).termineNew[0];
		expect(row([held]).sub).toContain('10:30 Uhr');
		expect(row([email('e')]).sub).not.toContain('10:30');
		expect(row([held]).title).toBe('Güteverhandlung');
	});

	it('keeps the words when the date cannot be read', () => {
		const row = dayOf(item('court', { events: [hearing('Termin', 'Anfang Dezember')] })).termineNew[0];
		expect(row.date).toBeNull();
		expect(row.notes).toContain('Anfang Dezember');
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
