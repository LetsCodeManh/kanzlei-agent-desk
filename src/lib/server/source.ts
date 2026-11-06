/** What a screen needs to show an email: its item, and its emails cut at their quotes. On the server, as the quotes are. */
import { error } from '@sveltejs/kit';
import type { Briefing } from '../types.ts';
import { markSegments, quotedFacts } from './briefing/verify.ts';
import { listKanzleien } from './connector.ts';

/** An action runs no load, so it checks the URL's Kanzlei itself. */
export function knownKanzlei(kanzlei: string): string {
	if (!listKanzleien().includes(kanzlei)) error(404, 'Diese Kanzlei gibt es nicht.');
	return kanzlei;
}

export function emailSource(briefing: Briefing | null, id: string) {
	const item = briefing?.items.find((candidate) => candidate.emails.some((email) => email.id === id));
	if (!item) error(404, 'Diese E-Mail steht nicht im Briefing.');
	const quotes = [item, ...(item.duplicates ?? [])].flatMap((source) =>
		source.facts ? quotedFacts(source.facts).map(([, quote]) => quote) : []
	);
	return {
		item,
		emails: item.emails.map((email) => ({ email, segments: markSegments(email.body, quotes) }))
	};
}
