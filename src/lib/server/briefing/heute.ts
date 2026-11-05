/**
 * "Heute": what the lawyer reads first. Code builds it from checked facts, with no LLM call.
 *
 * A sender known as `other` stays out, as in the tiers: text in an email cannot put a newsletter's "letzte Frist" or
 * an unknown sender's demand here. An unsure role stays in: rank higher, never lower.
 */
import type { Akte, Coverage, Day, Frist, Heute, HeuteLine, Item, RankedItem } from '../../types.ts';
import { SOON_DAYS } from './akte.ts';
import { daysBetween, parseDay, shortGerman } from './frist.ts';

const TERMIN_DAYS = ['Heute', 'Morgen'];

function termine(akten: Akte[], today: Day): HeuteLine[] {
	return akten
		.flatMap((akte) =>
			akte.termine.flatMap((termin) => {
				const label = TERMIN_DAYS[daysBetween(today, parseDay(termin.date))];
				if (!label) return [];
				const file = akte.az_gericht || akte.aktenzeichen;
				const text = `${label} ${termin.time}: ${termin.what}, ${file} (${akte.mandant.name}), ${termin.room}`;
				return [{ sortKey: `${termin.date} ${termin.time}`, text, emailIds: [] }];
			})
		)
		.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
		.map(({ text, emailIds }) => ({ text, emailIds }));
}

function emailIds(item: Item): string[] {
	return item.emails.map((email) => email.id);
}

function fileLabel(item: Item): string {
	return item.akte ?? (item.aktenzeichen || 'ohne Akte');
}

/** The date `daysLeft` counts to: a stated date may not move, so it shows unmoved. */
function shownEnd(frist: Frist): Day {
	return (frist.trigger === 'stated_date' ? frist.rawEnd : frist.end) as Day;
}

function fristLine(item: Item, frist: Frist): HeuteLine {
	const end = shortGerman(shownEnd(frist));
	const when = (frist.daysLeft as number) < 0 ? `, abgelaufen am ${end}` : ` bis ${end}`;
	const check = frist.relative ? ' (relative Angabe, prüfen)' : '';
	return { text: `${fileLabel(item)}: ${frist.what}${when}${check}`, emailIds: emailIds(item) };
}

function near(frist: Frist): boolean {
	return frist.daysLeft !== null && frist.daysLeft <= SOON_DAYS;
}

export function buildHeute(items: RankedItem[], akten: Akte[], today: Day): Heute {
	const counted = items.filter((item) => !(item.role === 'other' && item.roleSure));
	const fristen = counted.flatMap((item) => item.fristen.map((frist) => ({ item, frist })));
	return {
		termine: termine(akten, today),
		anrufen: counted
			.filter((item) => item.wvToday || (item.urgent && (item.role === 'client' || !item.roleSure)))
			.map((item) => ({ text: item.summary, emailIds: emailIds(item) })),
		pruefen: fristen.flatMap(({ item, frist }) => {
			if (frist.end === null) return [{ text: `${fileLabel(item)}: ${frist.reason}`, emailIds: emailIds(item) }];
			return frist.relative && !near(frist) ? [fristLine(item, frist)] : [];
		}),
		bald: fristen
			.filter(({ frist }) => near(frist))
			.sort((a, b) => (a.frist.daysLeft as number) - (b.frist.daysLeft as number))
			.map(({ item, frist }) => fristLine(item, frist))
	};
}

export function coverageLine({ read, notRead }: Coverage): string {
	return `${read} ${read === 1 ? 'E-Mail' : 'E-Mails'} gelesen, ${notRead} nicht gelesen`;
}
