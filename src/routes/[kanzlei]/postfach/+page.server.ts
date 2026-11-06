import { fail, redirect } from '@sveltejs/kit';
import { isAddable } from '#lib/connectors.ts';
import { setMark } from '#lib/server/mailbox.ts';
import { knownKanzlei } from '#lib/server/source.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** The Postfach opens on the newest email in the Eingang, so the reader is never empty while there is mail. */
export const load: PageServerLoad = async ({ parent }) => {
	const { briefing, kanzlei, mailbox } = await parent();
	const mails = briefing?.day.postfach ?? [];
	const newest = mails.find((mail) => !mailbox.archived.includes(mail.id)) ?? mails[0];
	if (newest) redirect(307, `/${kanzlei}/postfach/${newest.id}`);
};

/** The URL and the form are a trust boundary: only a Kanzlei that exists, and only a connector on the list. */
async function setAdded({ params, request }: RequestEvent, on: boolean) {
	const kanzlei = knownKanzlei(params.kanzlei);
	const id = (await request.formData()).get('id');
	if (!isAddable(id)) return fail(400, { error: 'Diesen Connector gibt es nicht.' });
	setMark(kanzlei, 'added', id, on);
}

export const actions: Actions = {
	connect: (event) => setAdded(event, true),
	disconnect: (event) => setAdded(event, false)
};
