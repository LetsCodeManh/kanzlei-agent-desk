import { emailSource } from '#lib/server/source.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { briefing } = await parent();
	const { item, emails } = emailSource(briefing, params.email);
	// A forward and its original are one item. Here the reader asked for one email, so only that one shows.
	return { item, emails: emails.filter(({ email }) => email.id === params.email) };
};
