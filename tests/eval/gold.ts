/** `tests/eval/gold.json`: the labels, from the spike. */
import { readFileSync } from 'node:fs';

export interface GoldFrist {
	end: string | null;
	trigger: string;
	length: [number, string] | null;
}

export interface GoldEmail {
	akte: string | null;
	tier: number;
	sender_role: string;
	must_see: boolean;
	injection: boolean;
	fristen: GoldFrist[];
	traps: string[];
}

export interface GoldKanzlei {
	today: string;
	emails: Record<string, GoldEmail>;
}

export const GOLD: Record<string, GoldKanzlei> = JSON.parse(readFileSync(new URL('gold.json', import.meta.url), 'utf-8'));
