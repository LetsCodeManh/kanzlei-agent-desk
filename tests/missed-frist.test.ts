/** A Frist the model leaves out of a court's mail must not stay silent. Against the real emails and recorded replies. */
import { describe, expect, it } from 'vitest';
import { loadInbox, loadKanzlei } from '#lib/server/connector.ts';
import { loadAkten } from '#lib/server/briefing/akte.ts';
import { buildDay } from '#lib/server/briefing/day.ts';
import { extract } from '#lib/server/briefing/extract.ts';
import { buildItem, fristWording } from '#lib/server/briefing/items.ts';
import { rank } from '#lib/server/briefing/rank.ts';
import { check } from '#lib/server/briefing/verify.ts';
import type { Facts } from '#lib/types.ts';

async function briefingOf(kanzlei: string, id: string, change: (facts: Facts) => void = () => {}) {
	const info = loadKanzlei(kanzlei);
	const akten = loadAkten(kanzlei);
	const email = loadInbox(kanzlei).emails.find((candidate) => candidate.id === id);
	if (!email) throw new Error(`${id} not found`);
	const facts = structuredClone((await extract(email)).output) as Facts;
	change(facts);
	const items = rank([buildItem(email, facts, check(facts, email.body), info, info.simulated_today, akten)]);
	return { item: items[0], day: buildDay(items, akten, info.simulated_today) };
}

const dropFristen = (facts: Facts) => void (facts.fristen = []);

describe('a Frist the model left out', () => {
	it.each([
		['kanzlei-berlin', 'b01'],
		['kanzlei-berlin', 'b02'],
		['kanzlei-muenchen', 'm01'],
		['kanzlei-muenchen', 'm03']
	])('%s %s: with its Fristen planted out, it is tier 1 and in Datum prüfen, with no date', async (kanzlei, id) => {
		const { item, day } = await briefingOf(kanzlei, id, dropFristen);
		expect(item.tier).toBe(1);
		expect(day.pruefen).toHaveLength(1);
		expect(day.pruefen[0].iso).toBeNull();
		expect(day.pruefen[0].emailIds).toEqual([id]);
	});

	it('a status not_found does not hide it', async () => {
		const { day } = await briefingOf('kanzlei-berlin', 'b01', (facts) => {
			facts.fristen[0].status = 'not_found';
		});
		expect(day.pruefen).toHaveLength(1);
	});

	it.each([
		['kanzlei-berlin', 'b11'], // a court's moved hearing
		['kanzlei-muenchen', 'm09'], // a court's hearing
		['kanzlei-berlin', 'b05'], // a newsletter's "Frist"
		['kanzlei-berlin', 'b04'] // the firm's own "Frist"
	])('%s %s: it adds nothing', async (kanzlei, id) => {
		const { day } = await briefingOf(kanzlei, id);
		expect(day.pruefen).toHaveLength(0);
	});

	it('an email marked as an injection gets no row from its text', async () => {
		const { day } = await briefingOf('kanzlei-berlin', 'b01', (facts) => {
			dropFristen(facts);
			facts.injection_suspect.present = true;
		});
		expect(day.pruefen).toHaveLength(0);
	});
});

describe('the wording', () => {
	it.each([
		'Der Klägerin wird aufgegeben, Stellung zu nehmen.',
		'Sie erhalten Gelegenheit zur Äußerung bis zum 21.11.2026.',
		'innerhalb von zwei Wochen nach Zustellung',
		'Gegen dieses Urteil ist die Berufung binnen eines Monats zulässig.',
		'Die Notfrist beginnt mit der Zustellung.'
	])('finds: %s', (line) => {
		expect(fristWording(`Sehr geehrte Damen und Herren,\n${line}\nMit freundlichen Grüßen`)).toBe(line);
	});

	it.each([
		'Der befristete Vertrag endet im Dezember.',
		'Ihr wurde fristlos gekündigt.',
		'> Am 01.10.2026 schrieb das Gericht: binnen zwei Wochen.'
	])('skips: %s', (line) => {
		expect(fristWording(line)).toBeNull();
	});

	it('a long line is cut, and the words stay as written', () => {
		const passage = fristWording(`binnen zwei Wochen ${'x'.repeat(200)}`);
		expect(passage?.startsWith('binnen zwei Wochen')).toBe(true);
		expect(passage).toHaveLength(91);
	});
});
