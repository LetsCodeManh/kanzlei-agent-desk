/** What a row in the Eingang says beyond its email: the marks, its day group, its subject. No node imports: the browser loads this. */
import { dayLabel, germanDay, germanTime } from './format.ts';
import type { Day, DayRow, DayScreen, MailRow } from './types.ts';

export interface MailMark {
	text: string;
	tone?: 'warning' | 'error';
}

export interface MailGroup {
	name: 'Heute' | 'Gestern' | 'Früher';
	mails: MailRow[];
}

/** No date comes first: it has to be checked, which is the safe side. */
function soonest(rows: DayRow[]): DayRow | undefined {
	return rows.toSorted((a, b) => (a.days ?? Number.MIN_SAFE_INTEGER) - (b.days ?? Number.MIN_SAFE_INTEGER))[0];
}

/**
 * A warning and an unsure fact first, then the most pressing. A date is the one on "Heute": it comes from that row, so the
 * two screens cannot differ.
 */
export function mailMarks(day: DayScreen, mail: MailRow): MailMark[] {
	const about = (rows: DayRow[]) => rows.filter((row) => row.emailIds.includes(mail.id));
	const marks: MailMark[] = [];

	if (mail.warning) marks.push({ text: 'Warnung', tone: 'warning' });
	if (mail.unsure) marks.push({ text: 'unsicher', tone: 'error' });
	if (mail.labels.includes('Frist')) {
		const frist = soonest(about([...day.pruefen, ...day.bald, ...day.spaeter]));
		if (!frist) throw new Error(`${mail.id}: labelled Frist, but no Frist row holds it`);
		marks.push({
			text: frist.date ? `Frist ${frist.date}` : 'Frist: Datum prüfen',
			tone: frist.tone === 'danger' ? 'error' : frist.tone === 'warn' ? 'warning' : undefined
		});
	}
	if (mail.labels.includes('Aufgabe')) marks.push({ text: 'Aufgabe' });
	if (mail.labels.includes('Termin')) {
		const termin = soonest(about([...day.termineNew, ...day.ereignisse]));
		marks.push({ text: termin?.date ? `Termin ${termin.date}` : 'Termin' });
	}
	return marks;
}

/** Heute, Gestern, Früher, by the day in Germany. A group with no email has no heading. The list stays newest first. */
export function dayGroups(mails: MailRow[], today: Day): MailGroup[] {
	const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
	const nameOf = (mail: MailRow): MailGroup['name'] => {
		const day = germanDay(mail.received);
		return day === today ? 'Heute' : day === yesterday ? 'Gestern' : 'Früher';
	};
	return (['Heute', 'Gestern', 'Früher'] as const)
		.map((name) => ({ name, mails: mails.filter((mail) => nameOf(mail) === name) }))
		.filter((group) => group.mails.length > 0);
}

/** `07:50` today, `Fr 30 Okt` before. */
export function rowWhen(received: string, today: Day): string {
	const day = germanDay(received);
	return day === today ? germanTime(received) : dayLabel(day);
}

/** On a beA row the tag says beA, so the subject's own `beA: ` goes. A forward's `WG: beA: …` stays: an email, not beA. */
export function rowSubject(mail: MailRow): string {
	return mail.channel === 'bea' ? mail.subject.replace(/^beA:\s*/, '') : mail.subject;
}
