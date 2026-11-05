/** How facts read on a screen and on the command line. No node imports: the browser loads this. */
import type { Channel, Coverage, Day, Frist, Item } from './types.ts';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const LONG_DAY = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const GERMAN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' });
const GERMAN_TIME = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

export const TIER_LABELS: Record<number, string> = {
	1: 'Gericht mit Frist',
	2: 'Mandant: Frist läuft',
	3: 'Gegenseite mit Frist',
	4: 'Mandant bittet heute',
	5: 'Wiedervorlage, Akte, Termin',
	6: 'Sonstiges'
};

/** `RAin Clara Fiktiv` is `Clara`, for the greeting. */
export function firstName(name: string): string {
	return name.replace(/^((RAin|RA|Dr\.|Prof\.)\s+)+/, '').split(' ')[0];
}

/** `21.11.`, the short form for a line on the screen. */
export function shortGerman(day: Day): string {
	return `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
}

/** `Mo 02.11.`, the date on a row. */
export function weekdayGerman(day: Day): string {
	return `${WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${shortGerman(day)}`;
}

/** `Montag, 2. November`, above the day's answer. */
export function longGerman(day: Day): string {
	return LONG_DAY.format(new Date(`${day}T00:00:00Z`));
}

/** `Mo 2 Nov`. */
export function dayLabel(day: Day): string {
	const date = new Date(`${day}T00:00:00Z`);
	return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** `Mo 2 Nov, 08:05`, in German time, whatever the viewer's time zone is. */
export function receivedLabel(time: string): string {
	const date = new Date(time);
	return `${dayLabel(GERMAN_DAY.format(date))}, ${GERMAN_TIME.format(date)}`;
}

/** `November 2026`, the calendar's head. */
export function monthGerman(month: string): string {
	return MONTH.format(new Date(`${month}-01T00:00:00Z`));
}

/** Where an email came from, in the Postfach. */
export function channelLabel(channel: Channel): string {
	return channel === 'bea' ? 'beA' : 'Outlook';
}

/** The date `daysLeft` counts to: a stated date may not move, so it shows unmoved. */
export function shownEnd(frist: Frist): Day | null {
	return frist.trigger === 'stated_date' ? frist.rawEnd : frist.end;
}

export function fileLabel(item: Item): string {
	return item.akte ?? (item.aktenzeichen || 'ohne Akte');
}

export function coverageLine({ read, notRead }: Coverage): string {
	return `${read} ${read === 1 ? 'E-Mail' : 'E-Mails'} gelesen, ${notRead} nicht gelesen`;
}

/** `14 von 14 E-Mails gelesen`, in the header. */
export function readLine({ read, notRead }: Coverage): string {
	return `${read} von ${read + notRead} E-Mails gelesen`;
}
