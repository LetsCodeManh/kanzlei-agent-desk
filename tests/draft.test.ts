/** A draft is free text, so nothing quotes it. This is the check that keeps an invented date out of it. */
import { describe, expect, it } from 'vitest';
import { extract } from '#lib/server/briefing/extract.ts';
import { listKanzleien, loadInbox, loadKanzlei } from '#lib/server/connector.ts';
import { readDraft, unsupported, wantsDraft } from '#lib/server/draft.ts';
import type { Email } from '#lib/types.ts';

const email = { subject: 'AZ 38 Ca 7890/26', body: 'Die Frist endet am 21.11.2026. Bitte rufen Sie heute an.' } as Email;

describe('unsupported', () => {
	it('passes what the email holds', () => {
		expect(unsupported('Zu 38 Ca 7890/26: Ich rufe heute an. Die Frist endet am 21.11.2026. [Terminvorschlag]', email)).toEqual([]);
	});

	it('refuses a date, a number or a day the email does not hold', () => {
		expect(unsupported('Die Frist endet am 22.11.2026, also bis Freitag oder morgen.', email)).toEqual(['22.11.2026', 'Freitag', 'morgen']);
	});

	it('does not take a greeting for a date', () => {
		expect(unsupported('Guten Morgen, Frau Muster', email)).toEqual([]);
	});
});

describe('wantsDraft', () => {
	const facts = (value: string, present = false) => ({ sender_role: { value }, injection_suspect: { present } });

	it('leaves out beA, a suspect email and a newsletter', () => {
		expect(wantsDraft({ channel: 'email' } as Email, facts('client'))).toBe(true);
		expect(wantsDraft({ channel: 'bea' } as Email, facts('court'))).toBe(false);
		expect(wantsDraft({ channel: 'email' } as Email, facts('client', true))).toBe(false);
		expect(wantsDraft({ channel: 'email' } as Email, facts('other'))).toBe(false);
	});
});

describe('the recorded drafts', () => {
	it('has a checked draft for every email that wants one, or a changed prompt turns the button off unseen', async () => {
		for (const name of listKanzleien()) {
			const kanzlei = loadKanzlei(name);
			for (const email of loadInbox(name).emails) {
				const { output } = await extract(email, { live: false });
				const draft = readDraft(email, kanzlei);
				if (!wantsDraft(email, output as Parameters<typeof wantsDraft>[1])) expect(draft, email.id).toBeNull();
				else expect(unsupported(draft ?? 'NO DRAFT 0', email), email.id).toEqual([]);
			}
		}
	});
});
