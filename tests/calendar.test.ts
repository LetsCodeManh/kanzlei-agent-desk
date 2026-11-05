import { describe, expect, it } from 'vitest';
import { calendarRows, monthDays, monthsCovered, overdueRows, startDay, undatedRows } from '#lib/calendar.ts';
import { run } from '#lib/server/briefing/pipeline.ts';
import type { DayRow, DayScreen } from '#lib/types.ts';

const TODAY = '2026-11-02';

function row(id: string, iso: string | null, days: number | null): DayRow {
	return { id, title: id, sub: '', notes: [], date: iso, iso, time: null, when: '', days, tone: null, emailIds: [`e-${id}`], unsure: false, warning: false };
}

function screen(over: Partial<DayScreen>): DayScreen {
	return { termineAkte: [], termineNew: [], ereignisse: [], aufgaben: [], pruefen: [], bald: [], spaeter: [], postfach: [], ...over };
}

describe('no dated thing drops out of the calendar', () => {
	it.each(['kanzlei-berlin', 'kanzlei-muenchen'])('%s: every Termin and Frist is on the calendar or in Datum prüfen', async (kanzlei) => {
		const { day } = await run(kanzlei, { live: false });
		const all = [...day.termineAkte, ...day.termineNew, ...day.ereignisse, ...day.pruefen, ...day.bald, ...day.spaeter];
		const placed = [...calendarRows(day), ...undatedRows(day)];
		expect(placed.map((other) => other.id).sort()).toEqual(all.map((other) => other.id).sort());
	});

	it('a date the court set sits on that day, not on the moved one', async () => {
		const { day } = await run('kanzlei-berlin', { live: false });
		const court = calendarRows(day).find((other) => other.emailIds.includes('b02') && other.kind === 'frist');
		expect(court?.iso).toBe('2026-11-21');
	});

	it('a hearing with no date we can read goes to Datum prüfen', () => {
		const day = screen({ termineNew: [row('termin', null, null)] });
		expect(calendarRows(day)).toEqual([]);
		expect(undatedRows(day).map((other) => other.id)).toEqual(['termin']);
	});

	it('the months reach every row, an overdue Frist before today too', () => {
		const rows = calendarRows(screen({ bald: [row('old', '2026-09-30', -33)], spaeter: [row('late', '2027-01-04', 63)] }));
		expect(monthsCovered(rows, TODAY)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
		expect(overdueRows(rows).map((other) => other.id)).toEqual(['old']);
	});

	it('a past Termin is not overdue', () => {
		expect(overdueRows(calendarRows(screen({ termineAkte: [row('held', '2026-10-30', -3)] })))).toEqual([]);
	});
});

describe('the month and the day it opens on', () => {
	it('is six weeks from the Monday on or before the 1st', () => {
		const days = monthDays('2026-11');
		expect(days).toHaveLength(42);
		expect([days[0], days[41]]).toEqual(['2026-10-26', '2026-12-06']);
	});

	it('opens on the next day with something on it, or on the row the URL holds', () => {
		const rows = calendarRows(screen({ bald: [row('old', '2026-10-30', -3), row('next', '2026-11-03', 1)], spaeter: [row('late', '2026-12-09', 37)] }));
		expect(startDay(rows, TODAY)).toBe('2026-11-03');
		expect(startDay(rows, TODAY, 'e-late')).toBe('2026-12-09');
		expect(startDay([], TODAY)).toBe(TODAY);
	});
});
