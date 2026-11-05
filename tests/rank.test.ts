import { describe, expect, it } from 'vitest';
import { blankItem, buildItem, resolveRole } from '#lib/server/briefing/items.ts';
import { rank, tier, tierFor } from '#lib/server/briefing/rank.ts';
import type { Akte, Email, Facts, Frist, Item, Kanzlei, Role } from '#lib/types.ts';

const KANZLEI: Kanzlei = {
	name: 'n',
	land: 'BE',
	domain: 'kanzlei-berlin.example',
	anwalt: { name: '', address: '' },
	simulated_today: '2026-11-02'
};
const TODAY = '2026-11-02';

describe('the decision table', () => {
	it.each([
		['court', true, false, false, false, false, false, 1],
		['client', false, true, false, false, false, false, 2],
		['opponent', true, false, false, false, false, false, 3],
		['client', false, false, true, false, false, false, 4],
		['internal', false, false, false, true, false, false, 5],
		['other', false, false, false, false, true, false, 5],
		['court', false, false, false, false, false, true, 5], // the hearing rule: b11, m09
		['court', true, false, false, false, false, true, 1], // b02: its Frist wins, its Termin shows on the item
		['client', false, false, false, false, false, true, 6], // a Personalgespräch is not a hearing
		['other', false, false, false, false, false, true, 6],
		['court', false, false, false, false, false, false, 6], // a court notice with no Frist and no Termin
		['other', true, false, true, false, false, false, 6], // a newsletter's "letzte Frist" or an unknown sender's demand
		['internal', true, false, false, false, false, false, 6],
		['client', true, true, true, true, true, true, 2] // the highest row that holds wins
	] as [Role, boolean, boolean, boolean, boolean, boolean, boolean, number][])(
		'%s, Frist %s, event %s, urgent %s, WV %s, Akte soon %s, Termin %s: tier %i',
		(role, hasFrist, fristEvent, urgent, wv, akteSoon, hasTermin, expected) => {
			expect(tierFor(role, hasFrist, fristEvent, urgent, wv, akteSoon, hasTermin)).toBe(expected);
		}
	);
});

function emailAt(received: string): Email {
	return {
		id: received,
		channel: 'email',
		received,
		receivedDay: received.slice(0, 10),
		senderName: '',
		senderAddress: '',
		subject: '',
		body: ''
	};
}

function item(role: Role = 'other', over: Partial<Item> = {}, received = '2026-11-02T08:00:00+00:00'): Item {
	return { ...blankItem(), emails: [emailAt(received)], role, ...over };
}

function frist(end: string | null = null, daysLeft: number | null = null, quote = 'q'): Frist {
	return {
		what: '',
		trigger: 'zustellung',
		quote,
		quoteOk: true,
		status: 'found',
		lengthText: '',
		emailId: null,
		source: 'email',
		end,
		rawEnd: end,
		relative: false,
		reason: '',
		hint: '',
		daysLeft
	};
}

describe('tier', () => {
	it('ranks an unsure role with a Frist as court', () => {
		expect(tier(item('other', { roleSure: false, fristen: [frist()] }))).toBe(1);
	});

	it('leaves an unsure role with no facts in tier 6', () => {
		expect(tier(item('other', { roleSure: false }))).toBe(6);
	});

	it('does not change for an injection', () => {
		expect(tier(item('other', { injection: true }))).toBe(6);
		expect(tier(item('other'))).toBe(6);
	});
});

describe('rank', () => {
	it('in a tier: not computable first, then fewest days, then oldest', () => {
		const a = item('court', { fristen: [frist('2026-11-20', 18, 'a')] });
		const b = item('court', { fristen: [frist(null, null, 'b')] });
		const c = item('court', { fristen: [frist('2026-11-10', 8, 'c')] }, '2026-11-02T09:00:00+00:00');
		const d = item('court', { fristen: [frist('2026-11-10', 8, 'd')] }, '2026-10-30T09:00:00+00:00');
		const ranked = rank([a, b, c, d]);
		expect(ranked.map((r) => r.fristen[0].quote)).toEqual(['b', 'd', 'c', 'a']);
	});

	it('takes the tier before the days left', () => {
		const soonOpponent = item('opponent', { fristen: [frist('2026-11-03', 1, 'x')] });
		const laterCourt = item('court', { fristen: [frist('2026-12-01', 29, 'y')] });
		expect(rank([soonOpponent, laterCourt]).map((r) => r.fristen[0].quote)).toEqual(['y', 'x']);
	});

	it('makes the same Frist, forwarded, one item with both emails', () => {
		const court = item('court', { fristen: [frist('2026-11-12', 10)], akte: 'M-1' });
		const forward = item(
			'internal',
			{ fristen: [frist('2026-11-12', 10, 'other words')], akte: 'M-1' },
			'2026-11-02T10:00:00+00:00'
		);
		const expected = [...court.emails, ...forward.emails];
		const ranked = rank([forward, court]);
		expect(ranked).toHaveLength(1);
		expect(ranked[0].tier).toBe(1);
		expect(ranked[0].emails).toEqual(expected);
		expect(ranked[0].duplicates).toHaveLength(1);
	});

	it('without an Akte, merges on the same quote', () => {
		const court = item('court', { fristen: [frist(null, null, 'Binnen zwei Wochen')] });
		const forward = item('internal', { fristen: [frist(null, null, 'binnen  zwei Wochen')] });
		expect(rank([court, forward])).toHaveLength(1);
	});

	it('does not merge different Fristen', () => {
		const a = item('court', { fristen: [frist(null, null, 'a')] });
		const b = item('court', { fristen: [frist(null, null, 'b')] });
		expect(rank([a, b])).toHaveLength(2);
	});

	it('does not merge empty quotes', () => {
		const a = item('client', { fristen: [frist(null, null, '')] });
		const b = item('client', { fristen: [frist(null, null, ' ')] });
		expect(rank([a, b])).toHaveLength(2);
	});
});

describe('resolveRole: metadata and akten.json win over the LLM', () => {
	const AKTEN = [
		{ mandant: { address: 'm@example.com' }, gegenseite: { addresses: ['g@example.org'] } }
	] as Akte[];

	it.each([
		['poststelle@arbg-berlin.justiz.example', 'bea', 'other', ['court', true]],
		['poststelle@arbg-berlin.justiz.example', 'email', 'court', ['court', false]], // not via beA: the LLM's, unsure
		['kollege@kanzlei-berlin.example', 'email', 'client', ['internal', true]],
		['m@example.com', 'email', 'opponent', ['client', true]],
		['g@example.org', 'email', 'client', ['opponent', true]],
		['x@example.net', 'email', 'client', ['client', false]]
	] as [string, Email['channel'], Role, [Role, boolean]][])('%s by %s, the LLM says %s', (address, channel, llmRole, expected) => {
		const email = { ...emailAt('2026-11-02T08:00:00+00:00'), senderAddress: address, channel };
		expect(resolveRole(email, llmRole, false, KANZLEI, AKTEN)).toEqual(expected);
	});
});

describe('buildItem: from facts to an item', () => {
	function facts(over: Partial<Facts> = {}): Facts {
		return {
			summary: { text: 's', quotes: [] },
			sender_role: { value: 'client', quote: 'q' },
			aktenzeichen: { value: '', quote: '' },
			fristen: [],
			frist_event: { present: false, kind: 'other', date_text: '', quote: '' },
			urgent_request: { present: false, quote: '' },
			wiedervorlage_today: { present: false, quote: '' },
			events: [],
			injection_suspect: { present: false, quote: '' },
			...over
		};
	}
	const AKTEN = [
		{ mandant: { address: 'm@example.com' }, gegenseite: { addresses: ['g@example.org'] } }
	] as Akte[];
	const from = (address: string, channel: Email['channel'] = 'email'): Email => ({
		...emailAt('2026-11-02T08:00:00+00:00'),
		senderAddress: address,
		channel
	});

	it('a Kündigung gives a three-week Frist from Zugang', () => {
		const email = { ...emailAt('2026-10-30T17:00:00+00:00'), id: 'b03', senderAddress: 'c@example.net', receivedDay: '2026-10-30' };
		const built = buildItem(
			email,
			facts({ frist_event: { present: true, kind: 'kuendigung', date_text: 'gestern', quote: 'q' } }),
			{ sender_role: true, frist_event: true },
			KANZLEI,
			TODAY
		);
		expect(built.fristen).toHaveLength(1);
		expect(built.fristen[0]).toMatchObject({ end: '2026-11-19', daysLeft: 17, hint: 'Zugangsdatum prüfen' });
		expect(rank([built])[0].tier).toBe(2);
	});

	it('a beA court mail with no Zustellung date gets the eEB hint', () => {
		const built = buildItem(
			from('poststelle@arbg-berlin.justiz.example', 'bea'),
			facts({
				fristen: [{ what: 'Stellungnahme', trigger: 'zustellung', trigger_date_text: '', length_text: 'zwei Wochen', quote: 'q', status: 'found' }]
			}),
			{ sender_role: true, 'fristen[0]': true },
			KANZLEI,
			TODAY
		);
		expect(built.fristen[0]).toMatchObject({
			end: null,
			reason: 'Frist nicht berechenbar, Zustellungsdatum prüfen',
			hint: 'eEB abgeben. Falls heute: Fristende 16.11.2026'
		});
	});

	it('a Mahnbescheid has no length of its own: its end stays not computable, never 3 weeks', () => {
		const built = buildItem(
			from('m@example.com'),
			facts({ frist_event: { present: true, kind: 'mahnbescheid', date_text: 'gestern', quote: 'q' } }),
			{ sender_role: true, frist_event: true },
			KANZLEI,
			TODAY,
			AKTEN
		);
		expect(built.fristen[0]).toMatchObject({ end: null, reason: 'Frist nicht berechenbar, Fristlänge prüfen' });
	});

	it('a failed Frist quote keeps the Frist and marks it unsicher', () => {
		const built = buildItem(
			from('g@example.org'),
			facts({
				fristen: [{ what: 'x', trigger: 'stated_date', trigger_date_text: '13.11.2026', length_text: '', quote: 'made up', status: 'found' }]
			}),
			{ sender_role: true, 'fristen[0]': false },
			KANZLEI,
			TODAY,
			AKTEN
		);
		expect(built.unsicher).toEqual(['fristen[0]']);
		expect(rank([built])[0].tier).toBe(3);
	});

	it('drops a not_found Frist', () => {
		const built = buildItem(
			from('m@example.com'),
			facts({
				fristen: [{ what: 'x', trigger: 'stated_date', trigger_date_text: '17.09.2026', length_text: '', quote: 'q', status: 'not_found' }]
			}),
			{ sender_role: true, 'fristen[0]': true },
			KANZLEI,
			TODAY,
			AKTEN
		);
		expect(built.fristen).toEqual([]);
	});

	describe('a date someone set, on a day that is not a Werktag', () => {
		const stated = (date: string) =>
			facts({
				fristen: [{ what: 'x', trigger: 'stated_date', trigger_date_text: date, length_text: '', quote: 'q', status: 'found' }]
			});
		const COURT = 'poststelle@arbg-berlin.justiz.example';
		const checks = { sender_role: true, 'fristen[0]': true };

		it('b02, the court set Saturday 21.11: ranks by that day, and shows the moved date beside it', () => {
			const built = buildItem(from(COURT, 'bea'), stated('21.11.2026'), checks, KANZLEI, TODAY);
			expect(built.fristen[0]).toMatchObject({
				end: '2026-11-23',
				rawEnd: '2026-11-21',
				daysLeft: 19,
				hint: '21.11. (Gericht), 23.11. nach § 222 Abs. 2 ZPO, bitte prüfen'
			});
		});

		it('from the other side: the same count, and no claim about the ZPO or a court', () => {
			const built = buildItem(from('g@example.org'), stated('21.11.2026'), checks, KANZLEI, TODAY, AKTEN);
			expect(built.fristen[0]).toMatchObject({ daysLeft: 19, hint: '21.11. (genannt), 23.11. nächster Werktag, bitte prüfen' });
		});

		it('on a Werktag: one date and no hint', () => {
			const built = buildItem(from(COURT, 'bea'), stated('20.11.2026'), checks, KANZLEI, TODAY);
			expect(built.fristen[0]).toMatchObject({ end: '2026-11-20', daysLeft: 18, hint: '' });
		});

		it('a Frist that runs from Zustellung still counts to its moved end', () => {
			const built = buildItem(
				from(COURT, 'bea'),
				facts({
					// 7.11.2026 + 2 weeks is Saturday 21.11. The law moves this one: no doubt, so no hint.
					fristen: [{ what: 'x', trigger: 'zustellung', trigger_date_text: '07.11.2026', length_text: 'zwei Wochen', quote: 'q', status: 'found' }]
				}),
				checks,
				KANZLEI,
				TODAY
			);
			expect(built.fristen[0]).toMatchObject({ end: '2026-11-23', daysLeft: 21, hint: '' });
		});
	});

	describe("a moved hearing's old date", () => {
		const BODY = 'Der Kammertermin vom 12.11.2026 wird aufgehoben und verlegt auf Donnerstag, den 10.12.2026.';
		const withEvent = (what: string, body = BODY) =>
			buildItem(
				{ ...from('poststelle@arbg-berlin.justiz.example', 'bea'), body },
				facts({ events: [{ what, date_text: 'Donnerstag, den 10.12.2026', quote: 'q' }] }),
				{ sender_role: true },
				KANZLEI,
				TODAY
			).events[0].oldDate;

		it('b11: taken from the free text, because the body holds it', () => {
			expect(withEvent('Kammertermin neu angesetzt (verlegt vom 12.11.2026), Saal 108')).toBe('12.11.2026');
		});

		it('not shown when the body does not hold it: the free text sits outside the quote', () => {
			expect(withEvent('Kammertermin (verlegt vom 05.11.2026)')).toBeNull();
		});

		it('not taken from a hearing that was not moved', () => {
			expect(withEvent('Kammertermin, Ladung vom 12.11.2026')).toBeNull();
		});
	});
});
