/**
 * What the calendar on "Heute" shows, from the day's rows. No node imports: the browser loads this.
 * Every dated Termin and Frist is a row here. A row with no date cannot sit on a day, so `undatedRows` holds it.
 */
import type { Day, DayRow, DayScreen } from './types.ts';

export type CalendarRow = DayRow & { kind: 'termin' | 'frist' | 'ereignis'; iso: Day };

const DAY_MS = 86_400_000;

function time(day: Day): number {
	return Date.parse(`${day}T00:00:00Z`);
}

export function addDays(day: Day, count: number): Day {
	return new Date(time(day) + count * DAY_MS).toISOString().slice(0, 10);
}

function fristen(day: DayScreen): DayRow[] {
	return [...day.pruefen, ...day.bald, ...day.spaeter];
}

/** By day, a Termin before a Frist before anything else, each by its time. */
export function calendarRows(day: DayScreen): CalendarRow[] {
	const dated = (kind: CalendarRow['kind']) => (row: DayRow) => (row.iso === null ? [] : [{ ...row, kind, iso: row.iso }]);
	return [...[...day.termineAkte, ...day.termineNew].flatMap(dated('termin')), ...fristen(day).flatMap(dated('frist')), ...day.ereignisse.flatMap(dated('ereignis'))].sort(
		(a, b) => a.iso.localeCompare(b.iso) || b.kind.localeCompare(a.kind) || (a.time ?? '').localeCompare(b.time ?? '')
	);
}

export function undatedRows(day: DayScreen): DayRow[] {
	return [...day.termineNew, ...day.ereignisse, ...fristen(day)].filter((row) => row.iso === null);
}

/** One day's rows for its timeline: what has no time first, then by the clock. */
export function timelineRows(rows: CalendarRow[], day: Day): CalendarRow[] {
	return rows.filter((row) => row.iso === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

/** The days on the timeline, in order: each with a row, and the day picked even when empty, so a click has a place to land. */
export function timelineDays(rows: CalendarRow[], picked: Day): Day[] {
	return [...new Set([...rows.map((row) => row.iso), picked])].sort();
}

/** A Frist already past must not wait on a past tile of a month nobody turns back to. */
export function overdueRows(rows: CalendarRow[]): CalendarRow[] {
	return rows.filter((row) => row.kind === 'frist' && (row.days ?? 0) < 0);
}

/** Six weeks from the Monday on or before the 1st. */
export function monthDays(month: string): Day[] {
	const first = `${month}-01`;
	const monday = addDays(first, -((new Date(time(first)).getUTCDay() + 6) % 7));
	return Array.from({ length: 42 }, (_, index) => addDays(monday, index));
}

/** Every month from the first row to the last, today's among them. */
export function monthsCovered(rows: CalendarRow[], today: Day): string[] {
	const days = [today, ...rows.map((row) => row.iso)].sort();
	const last = days[days.length - 1].slice(0, 7);
	const months: string[] = [];
	for (let month = days[0].slice(0, 7); month <= last; month = addDays(`${month}-28`, 7).slice(0, 7)) months.push(month);
	return months;
}

/** The first day to show: the row the URL holds, or the next day with something on it, or today. */
export function startDay(rows: CalendarRow[], today: Day, emailId?: string): Day {
	const held = emailId && rows.find((row) => row.emailIds.includes(emailId));
	if (held) return held.iso;
	return rows.find((row) => row.iso >= today)?.iso ?? today;
}

/** A month's day to pick when it is turned to: today in today's month, else its first day with a row. */
export function firstDayOf(month: string, rows: CalendarRow[], today: Day): Day {
	if (today.startsWith(month)) return today;
	return rows.find((row) => row.iso.startsWith(month))?.iso ?? `${month}-01`;
}
