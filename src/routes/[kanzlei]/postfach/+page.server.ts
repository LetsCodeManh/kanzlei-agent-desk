import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** The Postfach opens on the newest email in the Eingang, so the reader is never empty while there is mail. */
export const load: PageServerLoad = async ({ parent }) => {
	const { briefing, kanzlei, mailbox } = await parent();
	const mails = briefing?.day.postfach ?? [];
	const newest = mails.find((mail) => !mailbox.archived.includes(mail.id)) ?? mails[0];
	if (newest) redirect(307, `/${kanzlei}/postfach/${newest.id}`);
};
