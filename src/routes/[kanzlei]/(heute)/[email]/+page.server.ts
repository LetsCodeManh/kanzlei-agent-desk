import { emailSource } from '#lib/server/source.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { briefing } = await parent();
	return emailSource(briefing, params.email);
};
