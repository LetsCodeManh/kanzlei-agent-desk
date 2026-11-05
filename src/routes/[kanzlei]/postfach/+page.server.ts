import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** The Postfach opens on the newest email, so the reader is never empty while there is mail. */
export const load: PageServerLoad = async ({ parent }) => {
	const { briefing, kanzlei } = await parent();
	const newest = briefing?.day.postfach[0];
	if (newest) redirect(307, `/${kanzlei}/postfach/${newest.id}`);
};
