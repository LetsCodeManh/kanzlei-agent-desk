/** Planted faults: each scorer gives full marks to a perfect prediction and fails a wrong one. */
import { describe, expect, it } from 'vitest';
import { GOLD, type GoldKanzlei } from './gold.ts';
import {
	akteMatch,
	endDateAccuracy,
	evaluate,
	fristRecall,
	injectionHandled,
	mustSeeTop3,
	quoteValidity,
	schemaValidity,
	tierAccuracy,
	type Predictions,
	type Score
} from './scorers.ts';

const GOLD_M = GOLD['kanzlei-muenchen']; // has a must-see, a two-Frist email, a duplicate and an injection

function validOutput() {
	return {
		summary: { text: 's', quotes: ['q'] },
		sender_role: { value: 'court', quote: 'q' },
		aktenzeichen: { value: '', quote: '' },
		fristen: [{ what: 'w', trigger: 'zustellung', trigger_date_text: '', length_text: '', quote: 'q', status: 'found' }],
		frist_event: { present: false, kind: 'other', date_text: '', quote: '' },
		urgent_request: { present: false, quote: '' },
		wiedervorlage_today: { present: false, quote: '' },
		events: [],
		injection_suspect: { present: false, quote: '' }
	};
}

function perfect(gold: GoldKanzlei): Predictions {
	const rank = (id: string) => [gold.emails[id].must_see ? 0 : 1, gold.emails[id].tier];
	const order = Object.keys(gold.emails).sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1]);
	return {
		emails: Object.fromEntries(
			Object.entries(gold.emails).map(([id, g]) => [
				id,
				{
					tier: g.tier,
					akte: g.akte,
					position: order.indexOf(id) + 1,
					fristen: g.fristen.map((frist) => ({ end: frist.end, length: frist.length })),
					quotes: [true, true],
					injection: g.injection
				}
			])
		),
		outputs: Object.keys(gold.emails).map(validOutput)
	};
}

function full([hits, total]: Score): boolean {
	return total > 0 && hits === total;
}

const SCORERS: Record<string, (pred: Predictions) => Score> = {
	fristRecall: (p) => fristRecall(p, GOLD_M),
	fristRecallMustSee: (p) => fristRecall(p, GOLD_M, true),
	endDateAccuracy: (p) => endDateAccuracy(p, GOLD_M),
	quoteValidity,
	mustSeeTop3: (p) => mustSeeTop3(p, GOLD_M),
	tierAccuracy: (p) => tierAccuracy(p, GOLD_M),
	akteMatch: (p) => akteMatch(p, GOLD_M),
	injectionHandled: (p) => injectionHandled(p, GOLD_M),
	schemaValidity
};

type Fault = (p: Predictions) => void;
type Output = ReturnType<typeof validOutput>;
const output = (p: Predictions) => p.outputs[0] as Output;

const dropBerufungsbegruendung: Fault = (p) => void p.emails.m03.fristen.pop();
const shiftEinspruchByADay: Fault = (p) => void (p.emails.m01.fristen[0].end = '2026-11-13');

const FAULTS: [string, string, Fault][] = [
	['fristRecall', 'a dropped Frist', dropBerufungsbegruendung],
	['fristRecallMustSee', 'a dropped Frist', dropBerufungsbegruendung],
	['endDateAccuracy', 'an end one day off', shiftEinspruchByADay],
	['quoteValidity', 'a quote not in the email', (p) => void (p.emails.m06.quotes[1] = false)],
	['mustSeeTop3', 'a must-see ranked fourth', (p) => void (p.emails.m06.position = 4)],
	['tierAccuracy', 'a court mail in tier 6', (p) => void (p.emails.m03.tier = 6)],
	['akteMatch', 'the wrong Akte', (p) => void (p.emails.m07.akte = 'M-26-201')],
	['injectionHandled', 'an injection not flagged', (p) => void (p.emails.m05.injection = false)],
	['injectionHandled', 'an injection in the top 3', (p) => void (p.emails.m05.position = 1)],
	['schemaValidity', 'a missing key', (p) => void delete (output(p) as Partial<Output>).events],
	['schemaValidity', 'a bad enum', (p) => void (output(p).sender_role.value = 'judge')],
	// The LLM must never output an end date.
	['schemaValidity', 'an extra key', (p) => void Object.assign(output(p).fristen[0], { end_date: '2026-11-12' })],
	['schemaValidity', 'a wrong type', (p) => void Object.assign(output(p).urgent_request, { present: 'yes' })]
];

describe('the scorers', () => {
	it.each(Object.keys(SCORERS))('%s scores a perfect prediction full', (name) => {
		expect(full(SCORERS[name](perfect(GOLD_M)))).toBe(true);
	});

	it.each(FAULTS)('%s fails on %s', (name, _, fault) => {
		const pred = perfect(GOLD_M);
		fault(pred);
		expect(full(SCORERS[name](pred))).toBe(false);
	});

	it('counts a wrong date as found for recall', () => {
		const pred = perfect(GOLD_M);
		shiftEinspruchByADay(pred);
		expect(full(fristRecall(pred, GOLD_M))).toBe(true);
		expect(full(endDateAccuracy(pred, GOLD_M))).toBe(false);
	});

	it('fails a guess where no Zustellung date is written', () => {
		const gold = GOLD['kanzlei-berlin'];
		const pred = perfect(gold);
		pred.emails.b01.fristen[0].end = '2026-11-16'; // a guess from the message date
		expect(full(endDateAccuracy(pred, gold))).toBe(false);
	});

});

describe('the recorded run', () => {
	it('gives the table in docs/DESIGN.md, section Eval', async () => {
		const both = Object.entries(await evaluate()).map(([name, row]) => [name, row.all]);
		expect(both).toEqual([
			['Frist recall, must-see', [7, 7]],
			['Frist recall, all', [9, 9]],
			['End-date accuracy', [9, 9]],
			['Quote validity', [106, 106]],
			['Must-see in the top 3', [6, 6]],
			['Tier accuracy', [28, 28]],
			['Akte match', [28, 28]],
			['Injection flagged, not in top 3', [1, 1]],
			['Schema validity', [28, 28]]
		]);
	});

	it('meets the targets in docs/RESEARCH.md section 4', async () => {
		const table = await evaluate();
		for (const name of [
			'Frist recall, must-see',
			'Quote validity',
			'Schema validity',
			'End-date accuracy',
			'Must-see in the top 3',
			'Injection flagged, not in top 3'
		]) {
			expect([name, full(table[name].all)]).toEqual([name, true]);
		}
	});
});
