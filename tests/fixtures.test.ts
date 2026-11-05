import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DATA = new URL('../data/', import.meta.url);
const KANZLEIEN = ['kanzlei-berlin', 'kanzlei-muenchen'];

function json(url: URL) {
	return JSON.parse(readFileSync(url, 'utf-8'));
}

function emailIds(kanzlei: string): string[] {
	const inbox = new URL(`${kanzlei}/inbox/`, DATA);
	return readdirSync(inbox).map((file) => json(new URL(file, inbox)).id);
}

function replies() {
	const replay = new URL('replay/', DATA);
	return readdirSync(replay).map((file) => json(new URL(file, replay)));
}

describe('the fake data', () => {
	it.each(KANZLEIEN)('%s has 14 emails', (kanzlei) => {
		expect(emailIds(kanzlei)).toHaveLength(14);
	});

	it('has one recorded reply per email', () => {
		const ids = KANZLEIEN.flatMap(emailIds).sort();
		expect(replies().map((reply) => reply.email_id).sort()).toEqual(ids);
	});

	it('records every reply under prompt v2', () => {
		// The hearing rule and "Heute" need no prompt change. A new version forces all 28 to be recorded again.
		expect(new Set(replies().map((reply) => reply.prompt_version))).toEqual(new Set(['v2']));
	});

	it.each(KANZLEIEN)('%s has a gold label for each email', (kanzlei) => {
		const gold = json(new URL('../tests/eval/gold.json', DATA))[kanzlei];
		expect(Object.keys(gold.emails).sort()).toEqual(emailIds(kanzlei).sort());
	});
});
