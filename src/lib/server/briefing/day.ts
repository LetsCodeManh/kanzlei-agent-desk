/**
 * The day's screen and the Postfach, built from the ranked items and the case list. Every email has a row in the
 * Postfach: a silently dropped email is the worst failure. No LLM call. Short titles come from checked facts, by code.
 *
 * A sender known as `other` stays out of the tasks and the Fristen, as in the tiers: text in an email cannot put a
 * newsletter's "letzte Frist" or an unknown sender's demand there. An unsure role stays in: rank higher, never lower.
 */
import { fileLabel, weekdayGerman, shownEnd } from '../../format.ts';
import type { Akte, Day, DayRow, DayScreen, Email, Frist, ItemEvent, MailLabel, MailRow, RankedItem } from '../../types.ts';
import { SOON_DAYS } from './akte.ts';
import { addDays, daysBetween, parseDay } from './frist.ts';

function whenLabel(days: number | null, past = 'abgelaufen'): string {
	if (days === null) return '';
	if (days < 0) return past;
	if (days === 0) return 'heute';
	if (days === 1) return 'morgen';
	return `in ${days} Tagen`;
}

function whoLabel(item: RankedItem): string {
	return [item.akteRecord?.mandant.name, fileLabel(item)].filter(Boolean).join(' · ');
}

function sourceLabel(item: RankedItem): string {
	const email = item.emails[0];
	if (!email) return 'aus der Akte';
	const channel = email.channel === 'bea' ? 'beA' : 'E-Mail';
	const sender = email.senderName || email.senderAddress;
	return sender === item.akteRecord?.mandant.name ? channel : `${channel}, ${sender}`;
}

function emailIds(item: RankedItem): string[] {
	return item.emails.map((email) => email.id);
}

function fristRow(item: RankedItem, itemIndex: number, frist: Frist, index: number): DayRow {
	const end = shownEnd(frist);
	const notes = [frist.reason, frist.hint].filter(Boolean);
	if (frist.relative && !notes.some((note) => note.includes('prüfen'))) notes.push('Relative Angabe, bitte prüfen');
	return {
		id: `frist-${itemIndex}-${index}`,
		title: frist.what,
		sub: `${whoLabel(item)} · ${sourceLabel(item)}`,
		notes,
		date: end ? weekdayGerman(end) : null,
		iso: end,
		time: null,
		when: whenLabel(frist.daysLeft),
		days: frist.daysLeft,
		tone: frist.daysLeft !== null && frist.daysLeft <= 1 ? 'danger' : end === null || frist.relative ? 'warn' : null,
		emailIds: emailIds(item),
		unsure: !frist.quoteOk,
		warning: false
	};
}

/** The verb comes from the verified quote. No match: it says to answer, the safe reading of a same-day request. */
function askTitle(item: RankedItem): string {
	const name = item.emails[0]?.senderName || item.akteRecord?.mandant.name || 'Absender';
	return /ruf|telefon/i.test(item.facts?.urgent_request.quote ?? '') ? `${name} zurückrufen` : `${name} antworten`;
}

function aufgabeRow(item: RankedItem): DayRow {
	const event = item.events[0];
	const ids = emailIds(item);
	return {
		// The email's id, not a place in the list: a tick must survive "Neu lesen".
		id: `aufgabe-${ids[0]}`,
		// A Wiedervorlage's summary names its task after a colon. No colon: the whole summary stays.
		title: item.wvToday ? item.summary.slice(item.summary.indexOf(':') + 1).trim() : askTitle(item),
		// An ask's title already names the person.
		sub: item.wvToday ? `Wiedervorlage · ${whoLabel(item)}` : fileLabel(item),
		notes: event && !item.wvToday ? [`${event.what}, ${event.date_text}`] : [],
		date: null,
		iso: null,
		time: null,
		when: '',
		days: null,
		tone: null,
		emailIds: ids,
		unsure: item.unsicher.length > 0,
		warning: false
	};
}

const STATED_DAY = /(\d{2})\.(\d{2})\.(\d{4})/;
/** `14 Uhr`, `9:00 Uhr`, `8 bis 12 Uhr` (its start) or a bare `10:30`. Not the end of a date. */
const CLOCK = /(?<![\d.:])(\d{1,2})(?::(\d{2}))?(?:\s*(?:bis|-|–)\s*\d{1,2}(?::\d{2})?)?\s*Uhr|(?<![\d.:])(\d{1,2}):(\d{2})/;
/** Counted from the day the email arrived, not from today. `übermorgen` holds `morgen`, so it comes first. */
const RELATIVE_DAYS: [string, number][] = [
	['übermorgen', 2],
	['morgen', 1],
	['heute', 0]
];

/** `date_text` is unchecked: a date counts only if an email holds it. None: the row keeps the words, to be checked. */
function eventDay(event: ItemEvent, emails: Email[]): Day | null {
	const stated = STATED_DAY.exec(event.date_text);
	if (stated) return emails.some((email) => email.body.includes(stated[0])) ? `${stated[3]}-${stated[2]}-${stated[1]}` : null;
	const relative = RELATIVE_DAYS.find(([word]) => event.date_text.includes(word));
	if (!relative) return null;
	const holder = emails.find((email) => email.body.includes(relative[0]));
	if (!holder) return null;
	return addDays(holder.receivedDay, relative[1]);
}

/** `what` is unchecked too: a time counts only if an email holds it. */
function eventTime(event: ItemEvent, emails: Email[]): string | null {
	const match = CLOCK.exec(`${event.date_text} ${event.what}`);
	if (!match || !emails.some((email) => email.body.includes(match[0]))) return null;
	const hour = Number(match[1] ?? match[3]);
	const minute = Number(match[2] ?? match[4] ?? 0);
	if (hour > 23 || minute > 59) return null;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function eventRows(item: RankedItem, itemIndex: number, today: Day): DayRow[] {
	return item.events.map((event, index) => {
		const day = eventDay(event, item.emails);
		const days = day ? daysBetween(today, parseDay(day)) : null;
		const time = eventTime(event, item.emails);
		const notes = event.oldDate ? [`Verlegt, vorher ${event.oldDate}`] : [];
		// No date or no time to place it by, so the words stay: "morgen früh".
		if (!day || !time) notes.push(event.date_text);
		return {
			id: `termin-${itemIndex}-${index}`,
			// The title stops before any date in `what`.
			title: event.what.split(/[(,;]/)[0].trim(),
			sub: [whoLabel(item), sourceLabel(item)].filter(Boolean).join(' · '),
			notes,
			date: day ? weekdayGerman(day) : null,
			iso: day,
			time,
			when: whenLabel(days, 'vorbei'),
			days,
			tone: event.oldDate ? 'warn' : null,
			emailIds: emailIds(item),
			unsure: item.unsicher.length > 0,
			warning: false
		};
	});
}

/** Every hearing in the case list, by day and then time. */
function termineAkte(akten: Akte[], today: Day): DayRow[] {
	return akten
		.flatMap((akte) =>
			akte.termine.flatMap((termin) => {
				const days = daysBetween(today, parseDay(termin.date));
				const file = akte.az_gericht || akte.aktenzeichen;
				return [{ sortKey: `${termin.date} ${termin.time}`, termin, days, file, mandant: akte.mandant.name }];
			})
		)
		.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
		.map(({ termin, days, file, mandant }, index) => ({
			id: `akte-termin-${index}`,
			title: termin.what,
			sub: `${file} (${mandant}), ${termin.room} · aus der Akte`,
			notes: [],
			date: weekdayGerman(termin.date),
			iso: termin.date,
			time: termin.time,
			when: whenLabel(days, 'vorbei'),
			days,
			tone: days === 0 ? 'danger' : null,
			emailIds: [],
			unsure: false,
			warning: false
		}));
}

function byDays(a: DayRow, b: DayRow): number {
	return (a.days ?? 0) - (b.days ?? 0);
}

function mailRows(item: RankedItem, labels: MailLabel[]): MailRow[] {
	return item.emails.map((email) => ({
		id: email.id,
		channel: email.channel,
		received: email.received,
		sender: email.senderName || email.senderAddress,
		subject: email.subject,
		summary: item.summary,
		labels,
		unsure: item.unsicher.length > 0,
		warning: item.injection
	}));
}

function newestFirst(a: MailRow, b: MailRow): number {
	return Date.parse(b.received) - Date.parse(a.received) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function buildDay(items: RankedItem[], akten: Akte[], today: Day): DayScreen {
	const day: DayScreen = {
		termineAkte: termineAkte(akten, today),
		termineNew: [],
		ereignisse: [],
		aufgaben: [],
		pruefen: [],
		bald: [],
		spaeter: [],
		postfach: []
	};

	items.forEach((item, itemIndex) => {
		const labels: MailLabel[] = [];
		const counted = !(item.role === 'other' && item.roleSure);

		if (counted && (item.wvToday || (item.urgent && (item.role === 'client' || !item.roleSure)))) {
			day.aufgaben.push(aufgabeRow(item));
			labels.push('Aufgabe');
		}

		// By `counted`, not by tier: an internal Frist has tier 6 and must not stay in the Postfach alone.
		if (counted && item.fristen.length > 0) {
			item.fristen.forEach((frist, index) => {
				const row = fristRow(item, itemIndex, frist, index);
				const near = frist.daysLeft !== null && frist.daysLeft <= SOON_DAYS;
				if (frist.end === null || (frist.relative && !near)) day.pruefen.push(row);
				else if (near) day.bald.push(row);
				else day.spaeter.push(row);
			});
			labels.push('Frist');
		}

		if (item.role === 'court' && item.events.length > 0) {
			day.termineNew.push(...eventRows(item, itemIndex, today));
			labels.push('Termin');
		} else if (counted && !item.injection && item.events.length > 0) {
			// Text in an email cannot put a thing on the calendar from an unknown sender or a suspect mail.
			day.ereignisse.push(...eventRows(item, itemIndex, today));
			labels.push('Termin');
		}

		day.postfach.push(...mailRows(item, labels));
	});

	day.bald.sort(byDays);
	day.spaeter.sort(byDays);
	day.termineNew.sort(byDays);
	day.ereignisse.sort(byDays);
	day.postfach.sort(newestFirst);
	return day;
}
