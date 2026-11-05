import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	addPeriod,
	compute,
	eebHint,
	HOLIDAYS,
	nextWerktag,
	parseDate,
	parseLength,
	weekday
} from '#lib/server/briefing/frist.ts';

const MON_2_NOV = '2026-11-02';

describe('the cases DESIGN.md names', () => {
	it('31 Jan + 1 month ends on the last day of February (§ 188 Abs. 3 BGB)', () => {
		expect(addPeriod('2026-01-31', 1, 'month')).toBe('2026-02-28');
	});

	it('31 Jan + 1 month then moves off the Saturday', () => {
		expect(weekday('2026-02-28')).toBe(5);
		expect(compute('zustellung', '31.01.2026', 'einem Monat', MON_2_NOV, 'BE').end).toBe('2026-03-02');
	});

	it('an end on a Saturday moves to Monday', () => {
		const result = compute('stated_date', '21.11.2026', '', MON_2_NOV, 'BE');
		expect(result.rawEnd).toBe('2026-11-21');
		expect(result.end).toBe('2026-11-23');
	});

	it('an end on a holiday moves past the holidays and the weekend', () => {
		// 11.12. + 2 weeks = Fri 25.12. (holiday), Sat 26.12. (holiday), Sun 27.12.
		expect(compute('zustellung', '11.12.2026', 'zwei Wochen', MON_2_NOV, 'BY').end).toBe('2026-12-28');
	});

	it('6 Jan is a holiday in Bayern, not in Berlin', () => {
		// 23.12.2025 + 2 weeks = Tue 6.1.2026, Heilige Drei Könige.
		expect(compute('zustellung', '23.12.2025', 'zwei Wochen', MON_2_NOV, 'BY').end).toBe('2026-01-07');
		expect(compute('zustellung', '23.12.2025', 'zwei Wochen', MON_2_NOV, 'BE').end).toBe('2026-01-06');
	});
});

describe('§ 187 Abs. 1, § 188 BGB', () => {
	it('does not count the trigger day', () => {
		expect(addPeriod('2026-10-29', 2, 'week')).toBe('2026-11-12');
		expect(addPeriod('2026-10-29', 10, 'day')).toBe('2026-11-08');
	});

	it('keeps the day number in months, and crosses the year', () => {
		expect(addPeriod('2026-10-26', 2, 'month')).toBe('2026-12-26');
		expect(addPeriod('2026-11-30', 3, 'month')).toBe('2027-02-28');
	});

	it('keeps a Werktag', () => {
		expect(nextWerktag('2026-11-12', 'BE')).toBe('2026-11-12');
	});

	it('fails loudly on a year with no holidays typed in', () => {
		expect(() => nextWerktag('2028-01-03', 'BE')).toThrow('2028');
	});

	it('fails loudly on a non-positive length', () => {
		expect(() => addPeriod('2026-01-01', 0, 'week')).toThrow();
	});
});

describe('not computable: never a guess', () => {
	it('no Zustellung date', () => {
		const result = compute('zustellung', '', 'zwei Wochen', MON_2_NOV, 'BE');
		expect(result.end).toBeNull();
		expect(result.reason).toBe('Frist nicht berechenbar, Zustellungsdatum prüfen');
	});

	it('no length', () => {
		expect(compute('zugang', '29.10.2026', '', MON_2_NOV, 'BE').end).toBeNull();
	});

	it('the eEB hint computes from today', () => {
		expect(eebHint('zwei Wochen', MON_2_NOV, 'BE')).toBe('eEB abgeben. Falls heute: Fristende 16.11.2026');
	});
});

describe('parsing what the LLM copied', () => {
	it.each([
		['zwei Wochen', [2, 'week']],
		['einer Notfrist von einem Monat', [1, 'month']],
		['3 Wochen', [3, 'week']],
		['zehn Tagen', [10, 'day']],
		['zwei Monaten', [2, 'month']],
		['', null],
		['unverzüglich', null]
	])('parseLength(%j)', (text, expected) => {
		expect(parseLength(text)).toEqual(expected);
	});

	it.each([
		['29.10.2026', { date: '2026-10-29', relative: false }],
		['am 21.11.', { date: '2026-11-21', relative: false }],
		['05.01.', { date: '2027-01-05', relative: false }],
		['28. Oktober 2026', { date: '2026-10-28', relative: false }],
		['gestern', { date: '2026-11-01', relative: true }],
		['bis Freitag', { date: '2026-11-06', relative: true }],
		['Montag', { date: '2026-11-09', relative: true }],
		['demnächst', null]
	])('parseDate(%j) against the email date', (text, expected) => {
		expect(parseDate(text, MON_2_NOV)).toEqual(expected);
	});

	it('flags a relative date', () => {
		expect(compute('zugang', 'gestern', 'drei Wochen', '2026-10-30', 'BE')).toEqual({
			end: '2026-11-19',
			rawEnd: '2026-11-19',
			relative: true,
			reason: ''
		});
	});
});

describe('the hand-typed holidays against an independent source', () => {
	// Exported once from the Python `holidays` package, 2026 and 2027, subdiv BE and BY.
	const expected: Record<string, string[]> = JSON.parse(
		readFileSync(new URL('./holidays-expected.json', import.meta.url), 'utf-8')
	);

	it('Berlin matches the package', () => {
		expect([...HOLIDAYS.BE].sort()).toEqual(expected.BE);
	});

	it('Bayern matches the package, plus 15 August in München', () => {
		const lib = new Set(expected.BY);
		expect([...HOLIDAYS.BY].filter((day) => !lib.has(day)).sort()).toEqual(['2026-08-15', '2027-08-15']);
		expect(expected.BY.filter((day) => !HOLIDAYS.BY.has(day))).toEqual([]);
	});
});

// The port's traps. None of these has a spike twin.
describe('the traps of JavaScript dates', () => {
	it('fails loudly on a date that does not exist', () => {
		expect(() => parseDate('31.02.2026', MON_2_NOV)).toThrow();
		expect(() => parseDate('45.13.2026', MON_2_NOV)).toThrow();
		expect(() => parseDate('31. Februar 2026', MON_2_NOV)).toThrow();
		expect(() => parseDate('31.02.', MON_2_NOV)).toThrow();
	});

	it('finds a weekday earlier in the week than the email', () => {
		// Python's % never gives a negative. Every spike twin uses a Monday, so none would catch this.
		const friday = '2026-11-06';
		expect(parseDate('Montag', friday)).toEqual({ date: '2026-11-09', relative: true });
		expect(parseDate('Donnerstag', friday)).toEqual({ date: '2026-11-12', relative: true });
		expect(parseDate('Freitag', friday)).toEqual({ date: '2026-11-13', relative: true });
	});

	it('finds Sunday, which JavaScript counts as day 0', () => {
		expect(weekday('2026-11-08')).toBe(6);
		expect(parseDate('Sonntag', MON_2_NOV)).toEqual({ date: '2026-11-08', relative: true });
		expect(parseDate('Montag', '2026-11-08')).toEqual({ date: '2026-11-09', relative: true });
	});

	it('crosses a change to summer time without losing a day', () => {
		// 29 Mar 2026: clocks move in Germany. UTC arithmetic does not see it.
		expect(addPeriod('2026-03-28', 2, 'day')).toBe('2026-03-30');
	});
});

describe('the traps of JavaScript regexes', () => {
	it('reads März, in any case', () => {
		expect(parseDate('3. März 2027', MON_2_NOV)?.date).toBe('2027-03-03');
		expect(parseDate('3. MÄRZ 2027', MON_2_NOV)?.date).toBe('2027-03-03');
	});

	it('does not take a weekday or a word inside a longer word', () => {
		// JS \b is ASCII-only: it sees a boundary before é and ä. Python's does not.
		expect(parseDate('Freitagé', MON_2_NOV)).toBeNull();
		expect(parseDate('äFreitag', MON_2_NOV)).toBeNull();
		expect(parseDate('heuteä', MON_2_NOV)).toBeNull();
		expect(parseDate('Freitagabend', MON_2_NOV)).toBeNull();
	});

	it('takes vorgestern as -2, not as gestern', () => {
		expect(parseDate('vorgestern', MON_2_NOV)).toEqual({ date: '2026-10-31', relative: true });
	});
});
