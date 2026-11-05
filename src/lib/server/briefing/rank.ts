/**
 * The decision table. Rules in code over the checked facts. Text in an email cannot change a rank.
 *
 * | Tier | Rule |
 * | 1 | sender_role = court and a Frist (found or unsure) |
 * | 2 | sender_role = client and a frist_event |
 * | 3 | sender_role = opponent and a Frist |
 * | 4 | sender_role = client and an urgent_request |
 * | 5 | wiedervorlage_today, an open Frist in akten.json that ends soon, or sender_role = court and a Termin |
 * | 6 | everything else, collapsed |
 */
import type { Item, RankedItem, Role } from '../../types.ts';
import { ROLES } from './extract.ts';
import { normalise } from './verify.ts';

export function tierFor(
	role: Role,
	hasFrist: boolean,
	fristEvent: boolean,
	urgent: boolean,
	wvToday: boolean,
	akteFristSoon: boolean,
	hasTermin: boolean
): number {
	if (role === 'court' && hasFrist) return 1;
	if (role === 'client' && fristEvent) return 2;
	if (role === 'opponent' && hasFrist) return 3;
	if (role === 'client' && urgent) return 4;
	if (wvToday || akteFristSoon || (role === 'court' && hasTermin)) return 5;
	return 6;
}

/** An unsure sender role takes the highest tier any role would give: rank higher, never lower. */
export function tier(item: Item): number {
	const roles = item.roleSure ? [item.role] : ROLES;
	return Math.min(
		...roles.map((role) =>
			tierFor(
				role,
				item.fristen.length > 0,
				item.fristEvent,
				item.urgent,
				item.wvToday,
				item.akteFristSoon,
				item.events.length > 0
			)
		)
	);
}

/** In a tier: an end date not computable first, then the fewest days left, then the oldest email. */
function sortKey(item: RankedItem): [number, number, number, number] {
	const computableFirst = item.fristen.some((frist) => frist.end === null) ? 0 : 1;
	const days = Math.min(Infinity, ...item.fristen.flatMap((frist) => frist.daysLeft ?? []));
	// An item with no email comes before one with an email, all else equal.
	const oldest = Math.min(Infinity, ...item.emails.map((email) => Date.parse(email.received)));
	return [item.tier, computableFirst, days, item.emails.length ? oldest : -Infinity];
}

function byKey(a: RankedItem, b: RankedItem): number {
	const [keyA, keyB] = [sortKey(a), sortKey(b)];
	for (const [i, value] of keyA.entries()) {
		if (value !== keyB[i]) return value < keyB[i] ? -1 : 1;
	}
	return 0;
}

function fristKeys(item: Item): Set<string> {
	const keys = new Set<string>();
	for (const frist of item.fristen) {
		if (item.akte && frist.end) keys.add(`end\0${item.akte}\0${frist.end}`);
		else if (normalise(frist.quote)) keys.add(`quote\0${normalise(frist.quote)}`); // an empty quote is no evidence of sameness
	}
	return keys;
}

/** The same Frist forwarded twice: one item, both emails linked. The higher tier wins. */
function mergeDuplicates(items: RankedItem[]): RankedItem[] {
	const merged: RankedItem[] = [];
	for (const item of [...items].sort(byKey)) {
		const keys = fristKeys(item);
		const twin = merged.find((m) => [...fristKeys(m)].some((key) => keys.has(key)));
		if (twin) {
			twin.emails = [...twin.emails, ...item.emails];
			twin.duplicates = [...(twin.duplicates ?? []), item];
		} else {
			merged.push(item);
		}
	}
	return merged;
}

export function rank(items: Item[]): RankedItem[] {
	const ranked = items.map((item) => ({ ...item, tier: tier(item) }));
	return mergeDuplicates(ranked).sort(byKey);
}
