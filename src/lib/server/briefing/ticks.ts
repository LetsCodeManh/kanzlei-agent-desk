/**
 * The ticks on "Heute tun". They sit beside the briefing, so a reload and "Neu lesen" keep them.
 * A new day starts with none: a task still due that day must not look done.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Day } from '../../types.ts';
import { DATA, kanzleiDir } from '../connector.ts';

function path(kanzlei: string, data: string): string {
	return join(kanzleiDir(kanzlei, data), 'out', 'ticks.json');
}

/** A broken file throws: it must not look like no ticks. */
export function readTicks(kanzlei: string, today: Day, data = DATA): string[] {
	const file = path(kanzlei, data);
	if (!existsSync(file)) return [];
	const stored = JSON.parse(readFileSync(file, 'utf-8')) as { today: Day; ids: string[] };
	return stored.today === today ? stored.ids : [];
}

export function setTick(kanzlei: string, today: Day, id: string, done: boolean, data = DATA): void {
	const ids = new Set(readTicks(kanzlei, today, data));
	if (done) ids.add(id);
	else ids.delete(id);
	const file = path(kanzlei, data);
	writeFileSync(`${file}.tmp`, `${JSON.stringify({ today, ids: [...ids] })}\n`);
	renameSync(`${file}.tmp`, file);
}
