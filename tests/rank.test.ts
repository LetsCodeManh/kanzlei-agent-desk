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
		['court', true, false, false, false, false, 1],
		['client', false, true, false, false, false, 2],
		['opponent', true, false, false, false, false, 3],
		['client', false, false, true, false, false, 4],
		['internal', false, false, false, true, false, 5],
		['other', false, false, false, false, true, 5],
		['court', false, false, false, false, false, 6], // a court mail with no Frist: a Termin, a notice
		['other', true, false, true, false, false, 6], // a newsletter's "letzte Frist" or an unknown sender's demand
		['internal', true, false, false, false, false, 6],
		['client', true, true, true, true, true, 2] // the highest row that holds wins
	] as [Role, boolean, boolean, boolean, boolean, boolean, number][])(
		'%s, Frist %s, event %s, urgent %s, WV %s, Akte soon %s: tier %i',
		(role, hasFrist, fristEvent, urgent, wv, akteSoon, expected) => {
			expect(tierFor(role, hasFrist, fristEvent, urgent, wv, akteSoon)).toBe(expected);
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
});
