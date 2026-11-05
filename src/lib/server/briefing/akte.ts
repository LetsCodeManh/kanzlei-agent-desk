/**
 * `akten.json`: the Kanzleisoftware's case list, read-only. No code writes it.
 * It gives the briefing the past: a Mandant known by name, an open Frist noted from an older mail.
 */
import { join } from 'node:path';
import type { Akte, Day, Email } from '../../types.ts';
import { DATA, kanzleiDir, readChecked } from '../connector.ts';
import { daysBetween, parseDay } from './frist.ts';
import type { Schema } from './schema.ts';

/** An open Frist in the Akte that ends within a week, or is overdue, goes into tier 5. */
const SOON_DAYS = 7;

const STR: Schema = { type: 'string' };
const AKTEN: Schema = {
	type: 'array',
	items: {
		type: 'object',
		properties: {
			aktenzeichen: STR,
			az_gericht: STR,
			mandant: { type: 'object', properties: { address: STR }, required: ['address'] },
			gegenseite: {
				type: 'object',
				properties: { addresses: { type: 'array', items: STR } },
				required: ['addresses']
			},
			fristen: {
				type: 'array',
				items: { type: 'object', properties: { what: STR, end: STR, noted_from: STR }, required: ['what', 'end', 'noted_from'] }
			}
		},
		required: ['aktenzeichen', 'az_gericht', 'mandant', 'gegenseite', 'fristen']
	}
};

export function loadAkten(kanzlei: string, data = DATA): Akte[] {
	const path = join(kanzleiDir(kanzlei, data), 'akten.json');
	const akten = readChecked<Akte[]>(path, AKTEN);
	if (new Set(akten.map((akte) => akte.aktenzeichen)).size !== akten.length) {
		throw new Error(`Duplicate Aktenzeichen in ${path}`);
	}
	return akten;
}

/** "12 Ca 3456/26" matches "12 Ca  3456/26", not "112 Ca 3456/26" or "12 Ca 3456/267". */
function azPattern(az: string): RegExp {
	const tokens = az
		.trim()
		.split(/\s+/)
		.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	// JS \w is ASCII-only. These classes see what Python's \w sees, so ä is part of a word.
	return new RegExp(`(?<![\\p{L}\\p{N}_/-])${tokens.join('\\s*')}(?![\\p{L}\\p{N}_/-])`, 'iu');
}

/** By Aktenzeichen in the subject or body first (ours or the court's), then by sender. */
export function matchAkte(email: Email, akten: Akte[]): Akte | null {
	const text = `${email.subject}\n${email.body}`;
	for (const akte of akten) {
		for (const az of [akte.aktenzeichen, akte.az_gericht]) {
			if (az && azPattern(az).test(text)) return akte;
		}
	}
	return (
		akten.find(
			(akte) => email.senderAddress === akte.mandant.address || akte.gegenseite.addresses.includes(email.senderAddress)
		) ?? null
	);
}

export interface OpenFrist {
	what: string;
	end: Day;
	noted_from: string;
	daysLeft: number;
}

/** The Akte's open Fristen that end soon or are overdue. */
export function soon(akte: Akte, today: Day): OpenFrist[] {
	return akte.fristen
		.map((frist) => ({ ...frist, daysLeft: daysBetween(today, parseDay(frist.end)) }))
		.filter((frist) => frist.daysLeft <= SOON_DAYS);
}
