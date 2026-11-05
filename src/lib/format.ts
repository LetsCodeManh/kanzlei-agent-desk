/** How facts read on a screen and on the command line. No node imports: the browser loads this. */
import type { Coverage, Day, Frist, Item } from './types.ts';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
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

/** `21.11.`, the short form for a line on the screen. */
export function shortGerman(day: Day): string {
	return `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
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
