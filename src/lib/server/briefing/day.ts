/**
 * The day's screen, built from the ranked items and the case list. Each thing sits in one place, and every item lands
 * somewhere: a silently dropped email is the worst failure. No LLM call. Short titles come from checked facts, by code.
 *
 * A sender known as `other` stays out of the tasks and the Fristen, as in the tiers: text in an email cannot put a
 * newsletter's "letzte Frist" or an unknown sender's demand there. An unsure role stays in: rank higher, never lower.
 */
import { fileLabel, weekdayGerman, shownEnd } from '../../format.ts';
import type { Akte, Day, DayRow, DayScreen, Frist, RankedItem } from '../../types.ts';
import { SOON_DAYS } from './akte.ts';
import { daysBetween, parseDay } from './frist.ts';

function whenLabel(days: number | null): string {
	if (days === null) return '';
	if (days < 0) return 'abgelaufen';
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
		when: '',
		days: null,
		tone: null,
		emailIds: ids,
		unsure: item.unsicher.length > 0,
		warning: false
	};
}

function hearingRows(item: RankedItem, itemIndex: number, today: Day): DayRow[] {
	return item.events.map((event, index) => {
		const match = /(\d{2})\.(\d{2})\.(\d{4})/.exec(event.date_text);
		const day = match ? `${match[3]}-${match[2]}-${match[1]}` : null;
		const days = day ? daysBetween(today, parseDay(day)) : null;
		// `what` is unchecked: a time counts only if the email holds it, and the title stops before any date in it.
		const time = /\d{1,2}:\d{2}/.exec(`${event.date_text} ${event.what}`)?.[0];
		const checkedTime = time && item.emails.some((email) => email.body.includes(time)) ? time : null;
		const notes = event.oldDate ? [`Verlegt, vorher ${event.oldDate}`] : [];
		if (!day) notes.push(event.date_text); // no date to show in its column, so the words stay
		return {
			id: `termin-${itemIndex}-${index}`,
			title: event.what.split(/[(,;]/)[0].trim(),
			sub: [checkedTime && `${checkedTime} Uhr`, whoLabel(item), sourceLabel(item)].filter(Boolean).join(' · '),
			notes,
			date: day ? weekdayGerman(day) : null,
			when: whenLabel(days),
			days,
			tone: event.oldDate ? 'warn' : null,
			emailIds: emailIds(item),
			unsure: item.unsicher.length > 0,
			warning: false
		};
	});
}

/** Hearings today and tomorrow, by day and then time. */
function termineSoon(akten: Akte[], today: Day): DayRow[] {
	return akten
		.flatMap((akte) =>
			akte.termine.flatMap((termin) => {
				const days = daysBetween(today, parseDay(termin.date));
				if (days !== 0 && days !== 1) return [];
				const file = akte.az_gericht || akte.aktenzeichen;
				return [{ sortKey: `${termin.date} ${termin.time}`, termin, days, file, mandant: akte.mandant.name }];
			})
		)
		.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
		.map(({ termin, days, file, mandant }, index) => ({
			id: `soon-${index}`,
			title: termin.what,
			sub: `${termin.time} Uhr · ${file} (${mandant}), ${termin.room} · aus der Akte`,
			notes: [],
			date: weekdayGerman(termin.date),
			when: whenLabel(days),
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

export function buildDay(items: RankedItem[], akten: Akte[], today: Day): DayScreen {
	const day: DayScreen = {
		termineSoon: termineSoon(akten, today),
		termineNew: [],
		aufgaben: [],
		pruefen: [],
		bald: [],
		spaeter: [],
		rest: []
	};

	items.forEach((item, itemIndex) => {
		let placed = false;
		const counted = !(item.role === 'other' && item.roleSure);

		if (counted && (item.wvToday || (item.urgent && (item.role === 'client' || !item.roleSure)))) {
			day.aufgaben.push(aufgabeRow(item));
			placed = true;
		}

		// By `counted`, not by tier: an internal Frist has tier 6 and must not sit in a collapsed list.
		if (counted) {
			item.fristen.forEach((frist, index) => {
				const row = fristRow(item, itemIndex, frist, index);
				const near = frist.daysLeft !== null && frist.daysLeft <= SOON_DAYS;
				if (frist.end === null || (frist.relative && !near)) day.pruefen.push(row);
				else if (near) day.bald.push(row);
				else day.spaeter.push(row);
				placed = true;
			});
		}

		if (item.role === 'court' && item.events.length > 0) {
			day.termineNew.push(...hearingRows(item, itemIndex, today));
			placed = true;
		}

		if (!placed) {
			day.rest.push({
				id: `rest-${itemIndex}`,
				title: item.emails[0]?.senderName || item.emails[0]?.senderAddress || fileLabel(item),
				sub: item.summary,
				notes: [],
				date: null,
				when: '',
				days: null,
				tone: null,
				emailIds: emailIds(item),
				unsure: item.unsicher.length > 0,
				warning: item.injection
			});
		}
	});

	day.bald.sort(byDays);
	day.spaeter.sort(byDays);
	day.termineNew.sort(byDays);
	return day;
}
