/**
 * What the lawyer did in the Postfach: opened, archived, answered. Simulated: it sits beside the briefing, never touches
 * the inbox's files and sends nothing. So "Neu lesen" keeps it, and an archived email stays on "Heute" with its Frist.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mailbox, SentMail } from '../types.ts';
import { DATA, kanzleiDir } from './connector.ts';

function path(kanzlei: string, data: string): string {
	return join(kanzleiDir(kanzlei, data), 'out', 'mailbox.json');
}

/** A broken file throws: it must not look like every email unread and nothing answered. */
export function readMailbox(kanzlei: string, data = DATA): Mailbox {
	const file = path(kanzlei, data);
	if (!existsSync(file)) return { read: [], archived: [], sent: [] };
	return JSON.parse(readFileSync(file, 'utf-8')) as Mailbox;
}

function write(kanzlei: string, mailbox: Mailbox, data: string): void {
	const file = path(kanzlei, data);
	writeFileSync(`${file}.tmp`, `${JSON.stringify(mailbox)}\n`);
	renameSync(`${file}.tmp`, file);
}

export function setMark(kanzlei: string, mark: 'read' | 'archived', emailId: string, on: boolean, data = DATA): void {
	const mailbox = readMailbox(kanzlei, data);
	const ids = new Set(mailbox[mark]);
	if (on) ids.add(emailId);
	else ids.delete(emailId);
	write(kanzlei, { ...mailbox, [mark]: [...ids] }, data);
}

export function addSent(kanzlei: string, mail: SentMail, data = DATA): void {
	const mailbox = readMailbox(kanzlei, data);
	write(kanzlei, { ...mailbox, sent: [...mailbox.sent, mail] }, data);
}
