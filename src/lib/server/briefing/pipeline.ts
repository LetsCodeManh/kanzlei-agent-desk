/** The pipeline: inbox, one LLM call per email, quote check, Fristen, decision table, ranked items. */
import type { Day, Email, Facts, Kanzlei, RankedItem } from '../../types.ts';
import { loadInbox, loadKanzlei } from '../connector.ts';
import { loadAkten, matchAkte, soon } from './akte.ts';
import { DEFAULT_MODEL, extract, isLive, SCHEMA } from './extract.ts';
import { parseDay } from './frist.ts';
import { akteItem, buildItem } from './items.ts';
import type { LlmMeta } from './llm.ts';
import { rank } from './rank.ts';
import { errors } from './schema.ts';
import { check } from './verify.ts';

const LIVE_WORKERS = 4;

export interface Row {
	email: Email;
	facts: Facts;
	checks: Record<string, boolean>;
	meta: LlmMeta;
}

export interface Run {
	kanzlei: string;
	info: Kanzlei;
	today: Day;
	model: string;
	rows: Row[];
	items: RankedItem[];
}

/** fn over items, at most `limit` at a time. The results keep the items' order. */
async function mapInOrder<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index]);
		}
	}
	await Promise.all(Array.from({ length: limit }, worker));
	return results;
}

export async function run(
	kanzlei: string,
	{ model = DEFAULT_MODEL, live = isLive(), today }: { model?: string; live?: boolean; today?: Day } = {}
): Promise<Run> {
	const info = loadKanzlei(kanzlei);
	const day = today ?? parseDay(info.simulated_today);
	const emails = loadInbox(kanzlei);
	const results = await mapInOrder(emails, live ? LIVE_WORKERS : 1, (email) => extract(email, { model, live }));
	const rows = emails.map((email, i): Row => {
		const problems = errors(results[i].output, SCHEMA);
		if (problems.length > 0) {
			throw new Error(`${email.id}: the LLM output breaks the schema: ${problems.slice(0, 3).join('; ')}`);
		}
		const facts = results[i].output as Facts;
		return { email, facts, checks: check(facts, email.body), meta: results[i].meta };
	});
	const akten = loadAkten(kanzlei);
	const items = rows.map(({ email, facts, checks }) => {
		const akte = matchAkte(email, akten);
		return {
			...buildItem(email, facts, checks, info, day, akten),
			akte: akte?.aktenzeichen ?? null,
			akteRecord: akte
		};
	});
	const akteItems = akten.flatMap((akte) => soon(akte, day).map((frist) => akteItem(akte, frist)));
	return { kanzlei, info, today: day, model, rows, items: rank([...items, ...akteItems]) };
}
