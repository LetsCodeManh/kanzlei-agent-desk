/**
 * Ten emails the model had not seen, written with their answers by a separate agent. The numbers in the README come from here.
 * A record of one live run, not a gate: `pnpm eval` does not read it, and no prompt or wording is tuned to it.
 * `node tests/eval/unseen/score.ts` replays that run, with no login. A changed prompt fails it loudly.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadAkten } from '../../../src/lib/server/briefing/akte.ts';
import { extract } from '../../../src/lib/server/briefing/extract.ts';
import { parseDay } from '../../../src/lib/server/briefing/frist.ts';
import { buildItem } from '../../../src/lib/server/briefing/items.ts';
import { rank } from '../../../src/lib/server/briefing/rank.ts';
import { check } from '../../../src/lib/server/briefing/verify.ts';
import { loadInbox, loadKanzlei } from '../../../src/lib/server/connector.ts';
import type { Facts } from '../../../src/lib/types.ts';

interface Gold {
	fristen: { what: string; expected_end: string | null }[];
}

const DATA = `${join(import.meta.dirname, 'data')}/`;
const REPLAY = join(import.meta.dirname, 'replay');
const GOLD: Record<string, Gold> = JSON.parse(readFileSync(join(import.meta.dirname, 'gold.json'), 'utf-8'));

const total = { fristen: 0, found: 0, right: 0, wrong: 0, noFrist: 0, invented: 0, quotes: 0, quotesOk: 0 };
const fired: string[] = [];

for (const kanzlei of ['unseen-berlin', 'unseen-muenchen']) {
	const info = loadKanzlei(kanzlei, DATA);
	const akten = loadAkten(kanzlei, DATA);
	const { emails, notRead } = loadInbox(kanzlei, DATA);
	if (notRead.length) throw new Error(`Not read: ${JSON.stringify(notRead)}`);
	for (const email of emails) {
		const facts = (await extract(email, { live: false, replay: REPLAY })).output as Facts;
		const quoteChecks = check(facts, email.body);
		const checks = Object.values(quoteChecks);
		const [item] = rank([buildItem(email, facts, quoteChecks, info, parseDay(info.simulated_today), akten)]);
		const expected = GOLD[email.id].fristen.map((frist) => frist.expected_end);
		const fromModel = item.fristen.filter((frist) => frist.trigger !== 'wording');
		const open = [...expected];
		let right = 0;
		let wrong = 0;
		for (const { end } of fromModel) {
			if (end === null) continue;
			const at = open.indexOf(end);
			if (at === -1) {
				wrong += 1;
			} else {
				right += 1;
				open.splice(at, 1);
			}
		}
		const found = Math.min(fromModel.length, expected.length);
		const quotesOk = checks.filter(Boolean).length;

		total.fristen += expected.length;
		total.found += found;
		total.right += right;
		total.wrong += wrong;
		total.invented += Math.max(0, fromModel.length - expected.length);
		if (expected.length === 0) total.noFrist += 1;
		total.quotes += checks.length;
		total.quotesOk += quotesOk;
		if (fromModel.length < item.fristen.length) fired.push(email.id);

		console.log(
			`${email.id}  tier ${item.tier}  Fristen ${found} of ${expected.length}  right dates ${right}  quotes ${quotesOk} of ${checks.length}`
		);
	}
}

console.log(`
Fristen found: ${total.found} of ${total.fristen}
Right end date: ${total.right}, wrong end date: ${total.wrong}
Invented Fristen: ${total.invented}, ${total.noFrist} emails hold none
Quotes passed: ${total.quotesOk} of ${total.quotes}
The check for a Frist left out fired on: ${fired.join(', ') || 'none'}`);
