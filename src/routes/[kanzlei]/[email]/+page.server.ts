import { error } from '@sveltejs/kit';
import { markSegments, quotedFacts } from '#lib/server/briefing/verify.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { briefing } = await parent();
	const item = briefing?.items.find((candidate) => candidate.emails.some((email) => email.id === params.email));
	if (!item) error(404, 'Diese E-Mail steht nicht im Briefing.');
	const quotes = [item, ...(item.duplicates ?? [])].flatMap((source) =>
		source.facts ? quotedFacts(source.facts).map(([, quote]) => quote) : []
	);
	return {
		item,
		emails: item.emails.map((email) => ({ email, segments: markSegments(email.body, quotes) }))
	};
};
