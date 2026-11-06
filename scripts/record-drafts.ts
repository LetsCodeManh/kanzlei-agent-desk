/**
 * Calls the model: one call per email that wants a reply draft and has none. Ask first (`AGENTS.md`).
 * `node scripts/record-drafts.ts` records all of them. `node scripts/record-drafts.ts b03 m07` records those two.
 * A non-zero exit if a draft was refused or a call failed.
 */
import { extract } from '../src/lib/server/briefing/extract.ts';
import { listKanzleien, loadInbox, loadKanzlei } from '../src/lib/server/connector.ts';
import { readDraft, recordDraft, wantsDraft } from '../src/lib/server/draft.ts';

const only = process.argv.slice(2);
let failed = 0;

for (const name of listKanzleien()) {
	const kanzlei = loadKanzlei(name);
	for (const email of loadInbox(name).emails) {
		if (only.length > 0 && !only.includes(email.id)) continue;
		const { output } = await extract(email, { live: false });
		if (!wantsDraft(email, output as Parameters<typeof wantsDraft>[1])) continue;
		if (readDraft(email, kanzlei)) {
			console.log(`${email.id} recorded already`);
			continue;
		}
		try {
			const { text, refused } = await recordDraft(email, kanzlei);
			if (refused.length > 0) {
				failed++;
				console.log(`${email.id} REFUSED, not in the email: ${refused.join(', ')}\n${text}\n`);
			} else {
				console.log(`${email.id} recorded\n${text}\n`);
			}
		} catch (error) {
			failed++;
			console.log(`${email.id} FAILED: ${error}`);
		}
	}
}

process.exitCode = failed > 0 ? 1 : 0;
