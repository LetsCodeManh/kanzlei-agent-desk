/**
 * Frist end dates, computed by code. The LLM only copies the trigger date and the length as written.
 *
 * § 187 Abs. 1 BGB: the day of the trigger is not counted.
 * § 188 Abs. 2, 3 BGB: weeks and months end on the matching day. No such day ends on the month's last day.
 * § 222 Abs. 2 ZPO: an end on a Saturday, a Sunday or a holiday moves to the next Werktag.
 *
 * Every computation is on UTC days. No local Date method is used.
 */
import type { Day, Land, Trigger } from '../../types.ts';

export type Unit = 'day' | 'week' | 'month';

// Typed in by hand. Checked against the `holidays` package in tests/frist.test.ts.
// BY is München: 15 Aug (Mariä Himmelfahrt) is a holiday only in Catholic-majority communities. München is one.
export const HOLIDAYS: Record<Land, Set<Day>> = {
	BE: new Set([
		'2026-01-01', '2026-03-08', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25',
		'2026-10-03', '2026-12-25', '2026-12-26',
		'2027-01-01', '2027-03-08', '2027-03-26', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-17',
		'2027-10-03', '2027-12-25', '2027-12-26'
	]),
	BY: new Set([
		'2026-01-01', '2026-01-06', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25',
		'2026-06-04', '2026-08-15', '2026-10-03', '2026-11-01', '2026-12-25', '2026-12-26',
		'2027-01-01', '2027-01-06', '2027-03-26', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-17',
		'2027-05-27', '2027-08-15', '2027-10-03', '2027-11-01', '2027-12-25', '2027-12-26'
	])
};
export const YEARS = new Set([2026, 2027]);

const NUMBERS: Record<string, number> = {
	ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5,
	sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12
};
const UNITS: Record<string, Unit> = { tag: 'day', woche: 'week', monat: 'month' };
const MONTHS = [
	'januar', 'februar', 'märz', 'april', 'mai', 'juni',
	'juli', 'august', 'september', 'oktober', 'november', 'dezember'
];
const WEEKDAYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
const RELATIVE: [string, number][] = [['vorgestern', -2], ['gestern', -1], ['heute', 0]];

// JS \b is ASCII-only: it sees a word boundary beside ä. These two see what Python's \b sees.
const WORD_START = '(?<![\\p{L}\\p{N}_])';
const WORD_END = '(?![\\p{L}\\p{N}_])';

const LENGTH = new RegExp(`(\\d+|${Object.keys(NUMBERS).join('|')})\\s+(tag|woche|monat)`, 'iu');
const NUMERIC_DATE = new RegExp(`${WORD_START}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?(?!\\d)`, 'u');
const LONG_DATE = new RegExp(`${WORD_START}(\\d{1,2})\\.\\s*(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`, 'iu');

const MS_PER_DAY = 86_400_000;

/** § 4 KSchG: Kündigungsschutzklage within 3 weeks of Zugang. */
export const KSCHG_LENGTH: [number, Unit] = [3, 'week'];

function hasWord(text: string, word: string): boolean {
	return new RegExp(`${WORD_START}${word}${WORD_END}`, 'u').test(text);
}

function parts(day: Day): [number, number, number] {
	const [year, month, date] = day.split('-').map(Number);
	return [year, month, date];
}

function epochDay(day: Day): number {
	const [year, month, date] = parts(day);
	return Date.UTC(year, month - 1, date) / MS_PER_DAY;
}

function fromEpochDay(epoch: number): Day {
	return new Date(epoch * MS_PER_DAY).toISOString().slice(0, 10);
}

/** A day that exists, or a thrown error. Date.UTC alone turns 31 Feb into 3 Mar with no error. */
function makeDay(year: number, month: number, date: number): Day {
	const made = new Date(Date.UTC(year, month - 1, date));
	if (made.getUTCFullYear() !== year || made.getUTCMonth() !== month - 1 || made.getUTCDate() !== date) {
		throw new RangeError(`no such date: ${date}.${month}.${year}`);
	}
	return made.toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` from a file, or a thrown error. Python's date.fromisoformat fails on the same inputs. */
export function parseDay(text: string): Day {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) throw new RangeError(`not a YYYY-MM-DD date: ${text}`);
	return makeDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function addDays(day: Day, n: number): Day {
	return fromEpochDay(epochDay(day) + n);
}

/** Days from `from` to `to`: negative when `to` is earlier. */
export function daysBetween(from: Day, to: Day): number {
	return epochDay(to) - epochDay(from);
}

/** Monday is 0, as in Python. JS counts from Sunday. */
export function weekday(day: Day): number {
	return (new Date(epochDay(day) * MS_PER_DAY).getUTCDay() + 6) % 7;
}

/** "zwei Wochen" gives [2, "week"]. null if no length is written. */
export function parseLength(text: string): [number, Unit] | null {
	const match = LENGTH.exec(text);
	if (!match) return null;
	const n = match[1].toLowerCase();
	return [/^\d+$/.test(n) ? Number(n) : NUMBERS[n], UNITS[match[2].toLowerCase()]];
}

/** A date written without a year: the one of ref's year, the year before or after, closest to ref. */
function nearestYear(date: number, month: number, ref: Day): Day {
	const [refYear] = parts(ref);
	let best: Day | null = null;
	for (const year of [refYear - 1, refYear, refYear + 1]) {
		let candidate: Day;
		try {
			candidate = makeDay(year, month, date);
		} catch {
			continue; // 29 Feb exists only in some of the three years
		}
		if (best === null || Math.abs(daysBetween(ref, candidate)) < Math.abs(daysBetween(ref, best))) {
			best = candidate;
		}
	}
	if (best === null) throw new RangeError(`no such date: ${date}.${month}.`);
	return best;
}

/**
 * A date as written, against ref (the email's date). null if no date is written.
 *
 * relative is true for "gestern" or "Freitag": the UI says so, the lawyer checks it.
 * A weekday is the next one after ref ("bis Freitag" sent on Monday: that Friday).
 */
export function parseDate(text: string, ref: Day): { date: Day; relative: boolean } | null {
	const low = text.toLowerCase();
	let match = NUMERIC_DATE.exec(low);
	if (match) {
		const [date, month, year] = [Number(match[1]), Number(match[2]), match[3]];
		if (year) {
			return { date: makeDay(Number(year) + (year.length === 2 ? 2000 : 0), month, date), relative: false };
		}
		return { date: nearestYear(date, month, ref), relative: false };
	}
	match = LONG_DATE.exec(low);
	if (match) {
		const [date, month] = [Number(match[1]), MONTHS.indexOf(match[2]) + 1];
		return {
			date: match[3] ? makeDay(Number(match[3]), month, date) : nearestYear(date, month, ref),
			relative: false
		};
	}
	for (const [word, offset] of RELATIVE) {
		if (hasWord(low, word)) return { date: addDays(ref, offset), relative: true };
	}
	for (const [index, word] of WEEKDAYS.entries()) {
		if (hasWord(low, word)) {
			// JS % keeps the sign, Python's does not: add 7 first.
			const ahead = (index - weekday(ref) + 7) % 7 || 7;
			return { date: addDays(ref, ahead), relative: true };
		}
	}
	return null;
}

/** §§ 187 Abs. 1, 188 BGB: the end day of a Frist that starts with an event on `start`. */
export function addPeriod(start: Day, n: number, unit: Unit): Day {
	if (n < 1) throw new RangeError(`Frist length must be positive: ${n}`);
	if (unit === 'day') return addDays(start, n);
	if (unit === 'week') return addDays(start, n * 7);
	if (unit === 'month') {
		const [startYear, startMonth, startDate] = parts(start);
		const month0 = startMonth - 1 + n;
		const year = startYear + Math.floor(month0 / 12);
		const month = (month0 % 12) + 1;
		// Day 0 of the next month is this month's last day. setMonth would overflow instead.
		const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
		return makeDay(year, month, Math.min(startDate, last));
	}
	throw new RangeError(`unknown unit: ${unit}`);
}

export function isWerktag(day: Day, land: Land): boolean {
	const [year] = parts(day);
	if (!YEARS.has(year)) {
		throw new RangeError(`No holidays typed in for ${year} (${land}): add them to HOLIDAYS in frist.ts`);
	}
	return weekday(day) < 5 && !HOLIDAYS[land].has(day);
}

/** § 222 Abs. 2 ZPO: the day itself if it is a Werktag, else the next one. */
export function nextWerktag(day: Day, land: Land): Day {
	let current = day;
	while (!isWerktag(current, land)) current = addDays(current, 1);
	return current;
}

export interface Computed {
	end: Day | null;
	rawEnd: Day | null;
	relative: boolean;
	reason: string;
}

/** One Frist. end is null when it is not computable: never a guess. */
export function compute(trigger: Trigger, dateText: string, lengthText: string, ref: Day, land: Land): Computed {
	const out: Computed = { end: null, rawEnd: null, relative: false, reason: '' };
	const parsed = dateText ? parseDate(dateText, ref) : null;
	let raw: Day;
	if (trigger === 'stated_date') {
		if (parsed === null) return { ...out, reason: 'Fristende nicht lesbar, E-Mail prüfen' };
		raw = parsed.date;
	} else {
		if (parsed === null) {
			const what = trigger === 'zustellung' ? 'Zustellungsdatum' : 'Zugangsdatum';
			return { ...out, reason: `Frist nicht berechenbar, ${what} prüfen` };
		}
		const length = parseLength(lengthText);
		if (length === null) return { ...out, reason: 'Frist nicht berechenbar, Fristlänge prüfen' };
		raw = addPeriod(parsed.date, length[0], length[1]);
	}
	return { ...out, relative: parsed.relative, rawEnd: raw, end: nextWerktag(raw, land) };
}

function german(day: Day): string {
	const [year, month, date] = parts(day);
	return `${String(date).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

/** beA court mail with no Zustellung date yet. My reasoning, not verified in a source. */
export function eebHint(lengthText: string, today: Day, land: Land): string {
	const length = parseLength(lengthText);
	if (length === null) return 'eEB abgeben.';
	const end = nextWerktag(addPeriod(today, length[0], length[1]), land);
	return `eEB abgeben. Falls heute: Fristende ${german(end)}`;
}
