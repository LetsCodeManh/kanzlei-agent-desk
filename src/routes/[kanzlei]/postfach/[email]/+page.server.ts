import { fail, redirect } from '@sveltejs/kit';
import { answerSubject } from '#lib/format.ts';
import { readBriefing } from '#lib/server/briefing/pipeline.ts';
import { loadKanzlei } from '#lib/server/connector.ts';
import { readDraft } from '#lib/server/draft.ts';
import { addSent, readMailbox, setMark } from '#lib/server/mailbox.ts';
import { emailSource, knownKanzlei } from '#lib/server/source.ts';
import type { SentKind } from '#lib/types.ts';
import type { Actions, PageServerLoad, RouteParams } from './$types';

const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ADDRESS = 320;
const MAX_BODY = 20_000;

export const load: PageServerLoad = async ({ params, parent }) => {
	const { briefing } = await parent();
	const { item, emails } = emailSource(briefing, params.email);
	// A forward and its original are one item. Here the reader asked for one email, so only that one shows.
	const shown = emails.filter(({ email }) => email.id === params.email);
	return { item, emails: shown, draft: readDraft(shown[0].email, loadKanzlei(params.kanzlei)) };
};

/** The URL and the form are a trust boundary: only an email of this Kanzlei's briefing gets a mark or an answer. */
function opened(params: RouteParams) {
	const kanzlei = knownKanzlei(params.kanzlei);
	const { briefing } = readBriefing(kanzlei);
	const { emails } = emailSource(briefing, params.email);
	const email = emails.find((source) => source.email.id === params.email)?.email;
	if (!email) throw new Error(`${params.email} found in an item that does not hold it`);
	return { kanzlei, email, mails: briefing?.day.postfach ?? [] };
}

export const actions: Actions = {
	seen: async ({ params }) => {
		const { kanzlei, email } = opened(params);
		setMark(kanzlei, 'read', email.id, true);
	},
	unread: async ({ params }) => {
		const { kanzlei, email } = opened(params);
		setMark(kanzlei, 'read', email.id, false);
	},
	/** The reader moves to the next email in the Eingang, as a mail client does. It stays on "Heute" with its Frist. */
	archive: async ({ params }) => {
		const { kanzlei, email, mails } = opened(params);
		setMark(kanzlei, 'archived', email.id, true);
		const { archived } = readMailbox(kanzlei);
		const here = mails.findIndex((mail) => mail.id === email.id);
		const inbox = (mail: { id: string }) => !archived.includes(mail.id);
		const next = mails.slice(here + 1).find(inbox) ?? mails.slice(0, here).findLast(inbox);
		if (next) redirect(303, `/${kanzlei}/postfach/${next.id}`);
	},
	unarchive: async ({ params }) => {
		const { kanzlei, email } = opened(params);
		setMark(kanzlei, 'archived', email.id, false);
	},
	send: async ({ params, request }) => {
		const { kanzlei, email } = opened(params);
		const form = await request.formData();
		const kind = form.get('kind');
		const body = form.get('body');
		if ((kind !== 'reply' && kind !== 'forward') || typeof body !== 'string') return fail(400, { error: 'Diese Nachricht ist ungültig.' });
		// In reality beA has its own card and software, and a court expects the answer there, so it cannot go out from here.
		if (email.channel === 'bea') return fail(400, { error: 'beA-Post beantworten Sie in der Kanzleisoftware.' });

		const text = body.trim();
		if (kind === 'reply' && !text) return fail(400, { error: 'Bitte einen Text schreiben.' });
		if (text.length > MAX_BODY) return fail(400, { error: 'Der Text ist zu lang.' });

		const to = kind === 'reply' ? email.senderAddress : String(form.get('to') ?? '').trim();
		if (to.length > MAX_ADDRESS || !ADDRESS.test(to)) return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse angeben.' });

		const sentKind: SentKind = kind;
		addSent(kanzlei, { emailId: email.id, kind: sentKind, to, subject: answerSubject(sentKind, email.subject), body: text });
	}
};
