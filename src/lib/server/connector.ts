/**
 * The connector seam. It is the only code that knows where emails come from.
 *
 * The file shape follows Microsoft Graph's message resource (id, from.emailAddress, receivedDateTime, subject,
 * body.content), so a Graph connector maps one to one. `channel` (bea or email) is ours.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Channel, Day, Email, Kanzlei, NotRead } from '../types.ts';
import { parseDay } from './briefing/frist.ts';
import { errors, type Schema } from './briefing/schema.ts';

/** Found by walking up: this file is `src/lib/server` in `pnpm dev` and `node`, but a bundled chunk after `pnpm build`. */
function findData(): string {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (!existsSync(join(dir, 'data'))) {
		if (dir === dirname(dir)) throw new Error(`No data/ folder above ${fileURLToPath(import.meta.url)}`);
		dir = dirname(dir);
	}
	return `${join(dir, 'data')}/`;
}

export const DATA = findData();

const KANZLEI_NAME = /^[a-z0-9-]+$/;
const GERMAN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' });
const GRAPH_TIME = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

const STR: Schema = { type: 'string' };

function required(properties: Record<string, Schema>): Schema {
	return { type: 'object', properties, required: Object.keys(properties) };
}

const MESSAGE = required({
	id: STR,
	channel: { type: 'string', enum: ['bea', 'email'] satisfies Channel[] },
	receivedDateTime: STR,
	from: required({ emailAddress: required({ name: STR, address: STR }) }),
	subject: STR,
	body: required({ contentType: STR, content: STR })
});

const KANZLEI = required({
	name: STR,
	land: { type: 'string', enum: ['BE', 'BY'] },
	domain: STR,
	anwalt: required({ name: STR, address: STR }),
	simulated_today: STR
});

/** Parsed JSON that holds `schema`, or a thrown error that names the file. */
export function readChecked<T>(path: string, schema: Schema): T {
	const value = JSON.parse(readFileSync(path, 'utf-8'));
	const problems = errors(value, schema);
	if (problems.length > 0) throw new Error(`${path}: ${problems.slice(0, 3).join('; ')}`);
	return value as T;
}

/** The Kanzlei's folder. The name comes from a URL or the command line: refuse anything but a plain folder name. */
export function kanzleiDir(kanzlei: string, data = DATA): string {
	if (!KANZLEI_NAME.test(kanzlei)) {
		throw new Error(`Kanzlei name must match ${KANZLEI_NAME.source}: ${JSON.stringify(kanzlei)}`);
	}
	const path = join(data, kanzlei);
	if (!statSync(join(path, 'kanzlei.json'), { throwIfNoEntry: false })?.isFile()) {
		throw new Error(`No Kanzlei at ${path} (kanzlei.json missing)`);
	}
	return path;
}

/** The German calendar day of an instant. */
export function germanDay(time: string): Day {
	return GERMAN_DAY.format(new Date(time));
}

interface GraphMessage {
	id: string;
	channel: Channel;
	receivedDateTime: string;
	from: { emailAddress: { name: string; address: string } };
	subject: string;
	body: { contentType: string; content: string };
}

/** Python's isoformat, which the recorded prompts hold: `+00:00`, not `Z` and not `.000Z`. */
function isoTime(raw: GraphMessage): string {
	const match = GRAPH_TIME.exec(raw.receivedDateTime);
	if (!match) throw new Error(`${raw.id}: receivedDateTime is not a time with an offset: ${raw.receivedDateTime}`);
	parseDay(match[1]); // Date parses 31 Feb as 3 Mar, with no error
	return raw.receivedDateTime.replace(/Z$/, '+00:00');
}

function toEmail(raw: GraphMessage): Email {
	if (raw.body.contentType !== 'text') {
		throw new Error(`${raw.id}: only text bodies are supported, not ${raw.body.contentType}`);
	}
	const received = isoTime(raw);
	return {
		id: raw.id,
		channel: raw.channel,
		received,
		receivedDay: germanDay(received),
		senderName: raw.from.emailAddress.name,
		senderAddress: raw.from.emailAddress.address.toLowerCase(),
		subject: raw.subject,
		body: raw.body.content
	};
}

export interface Inbox {
	emails: Email[];
	notRead: NotRead[];
}

/** Every email in the Kanzlei's inbox, oldest first. A file that cannot be read is listed, and the others still load. */
export function loadInbox(kanzlei: string, data = DATA): Inbox {
	const inbox = join(kanzleiDir(kanzlei, data), 'inbox');
	const emails: Email[] = [];
	const notRead: NotRead[] = [];
	for (const file of readdirSync(inbox).filter((name) => name.endsWith('.json')).sort()) {
		try {
			emails.push(toEmail(readChecked<GraphMessage>(join(inbox, file), MESSAGE)));
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			notRead.push({ id: basename(file, '.json'), sender: '', subject: '', reason: 'Datei nicht lesbar', detail });
		}
	}
	if (new Set(emails.map((email) => email.id)).size !== emails.length) {
		throw new Error(`Duplicate email ids in ${inbox}`);
	}
	emails.sort((a, b) => Date.parse(a.received) - Date.parse(b.received) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	return { emails, notRead };
}

/** Every folder with a `kanzlei.json`, because `data/` also holds `replay/`. */
export function listKanzleien(data = DATA): string[] {
	return readdirSync(data)
		.filter((name) => statSync(join(data, name, 'kanzlei.json'), { throwIfNoEntry: false })?.isFile())
		.sort();
}

export function loadKanzlei(kanzlei: string, data = DATA): Kanzlei {
	return readChecked<Kanzlei>(join(kanzleiDir(kanzlei, data), 'kanzlei.json'), KANZLEI);
}
