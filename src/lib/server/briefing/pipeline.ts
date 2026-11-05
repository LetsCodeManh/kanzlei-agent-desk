/** The pipeline: inbox, one LLM call per email, quote check, Fristen, decision table, ranked items, "Heute". */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { coverageLine } from '../../format.ts';
import type { Briefing, Coverage, Day, Email, Facts, Heute, Kanzlei, NotRead, RankedItem } from '../../types.ts';
import { DATA, kanzleiDir, listKanzleien, loadInbox, loadKanzlei } from '../connector.ts';
import { loadAkten, matchAkte, soon } from './akte.ts';
import { DEFAULT_MODEL, extract, isLive, SCHEMA } from './extract.ts';
import { parseDay } from './frist.ts';
import { buildHeute } from './heute.ts';
import { akteItem, buildItem } from './items.ts';
import { LlmError, type LlmMeta } from './llm.ts';
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
	notRead: NotRead[];
	coverage: Coverage;
	heute: Heute;
}

interface RunOptions {
	model?: string;
	live?: boolean;
	today?: Day;
	data?: string;
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

function notReadOf(email: Email, reason: string, detail: string): NotRead {
	return { id: email.id, sender: email.senderName || email.senderAddress, subject: email.subject, reason, detail };
}

/**
 * One email's facts, or why it was not read. Only a failed model call and a bad reply count as not read. A missing
 * recorded reply (the replay is broken) and a bug still fail the Kanzlei.
 */
async function readEmail(email: Email, model: string, live: boolean): Promise<Row | NotRead> {
	let result;
	try {
		result = await extract(email, { model, live });
	} catch (error) {
		if (error instanceof LlmError) return notReadOf(email, 'Modell nicht erreichbar', error.message);
		throw error;
	}
	const problems = errors(result.output, SCHEMA);
	if (problems.length > 0) {
		return notReadOf(email, 'Antwort des Modells ungültig', problems.slice(0, 3).join('; '));
	}
	const facts = result.output as Facts;
	return { email, facts, checks: check(facts, email.body), meta: result.meta };
}

export async function run(
	kanzlei: string,
	{ model = DEFAULT_MODEL, live = isLive(), today, data = DATA }: RunOptions = {}
): Promise<Run> {
	const info = loadKanzlei(kanzlei, data);
	const day = today ?? parseDay(info.simulated_today);
	const inbox = loadInbox(kanzlei, data);
	const results = await mapInOrder(inbox.emails, live ? LIVE_WORKERS : 1, (email) => readEmail(email, model, live));
	const rows = results.filter((result): result is Row => 'facts' in result);
	const notRead = [...inbox.notRead, ...results.filter((result): result is NotRead => 'reason' in result)];
	const akten = loadAkten(kanzlei, data);
	const items = rows.map(({ email, facts, checks }) => {
		const akte = matchAkte(email, akten);
		return {
			...buildItem(email, facts, checks, info, day, akten),
			akte: akte?.aktenzeichen ?? null,
			akteRecord: akte
		};
	});
	const akteItems = akten.flatMap((akte) => soon(akte, day).map((frist) => akteItem(akte, frist)));
	const ranked = rank([...items, ...akteItems]);
	return {
		kanzlei,
		info,
		today: day,
		model,
		rows,
		items: ranked,
		notRead,
		coverage: { read: rows.length, notRead: notRead.length },
		heute: buildHeute(ranked, akten, day)
	};
}

/** One Kanzlei's run, written to its `out/briefing.json`. The button and `pnpm daily` both come here. */
export async function saveBriefing(kanzlei: string, options: RunOptions = {}): Promise<Run> {
	const result = await run(kanzlei, options);
	const briefing: Briefing = {
		kanzlei,
		info: result.info,
		today: result.today,
		model: result.model,
		coverage: result.coverage,
		notRead: result.notRead.map(({ detail: _, ...rest }) => rest),
		heute: result.heute,
		items: result.items
	};
	const out = join(kanzleiDir(kanzlei, options.data), 'out');
	mkdirSync(out, { recursive: true });
	// A rename, so a run that dies on the way leaves the last whole briefing, not half a file.
	writeFileSync(join(out, 'briefing.json.tmp'), `${JSON.stringify(briefing, null, 1)}\n`);
	renameSync(join(out, 'briefing.json.tmp'), join(out, 'briefing.json'));
	return result;
}

/** Every Kanzlei once. false if any failed or left an email not read. One failure does not stop the next Kanzlei. */
export async function runDaily(data = DATA): Promise<boolean> {
	const kanzleien = listKanzleien(data);
	if (kanzleien.length === 0) {
		console.error(`No Kanzlei found in ${data}`);
		return false;
	}
	let passed = true;
	for (const kanzlei of kanzleien) {
		try {
			const { coverage, notRead } = await saveBriefing(kanzlei, { data });
			const ids = notRead.map((email) => email.id).join(', ');
			console.log(`${kanzlei}: ${coverageLine(coverage)}${ids ? `: ${ids}` : ''}`);
			for (const email of notRead) console.error(`${kanzlei}/${email.id}: ${email.detail}`);
			if (notRead.length > 0) passed = false;
		} catch (error) {
			console.error(`${kanzlei}: ${error instanceof Error ? error.message : String(error)}`);
			passed = false;
		}
	}
	return passed;
}
