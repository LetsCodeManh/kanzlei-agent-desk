/** How facts read on a screen and on the command line. No node imports: the browser loads this. */
import type { Coverage, Day, Frist, Item } from './types.ts';

/** `21.11.`, the short form for a line on the screen. */
export function shortGerman(day: Day): string {
	return `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
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
