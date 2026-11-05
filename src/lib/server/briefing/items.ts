/**
 * From one email's checked facts to a briefing item: the sender role, the Fristen with end dates, the flags.
 *
 * Metadata and `akten.json` win over the LLM for the sender role. A failed quote keeps the fact and marks it unsicher:
 * when unsure, rank higher, never lower.
 */
import type { Akte, Day, Email, Facts, Frist, Item, ItemEvent, Kanzlei, Role, Status, Trigger } from '../../types.ts';
import type { OpenFrist } from './akte.ts';
import { compute, daysBetween, eebHint, KSCHG_LENGTH, movedDateHint } from './frist.ts';

const EVENT_FRISTEN: Partial<Record<Facts['frist_event']['kind'], string>> = {
	kuendigung: 'Kündigungsschutzklage (§ 4 KSchG)',
	mahnbescheid: 'Widerspruch gegen Mahnbescheid',
	klage: 'Klage zugestellt: Fristen aus der Klage prüfen'
};

function domainOf(address: string): string {
	return address.slice(address.lastIndexOf('@') + 1);
}

/**
 * [role, sure]. Metadata first: a beA message from a court domain, our own domain, a known Mandant or Gegenseite.
 * A court domain here is one with a "justiz" label. Production would use the sender's beA or EGVP identity.
 */
export function resolveRole(
	email: Email,
	llmRole: Role,
	llmQuoteOk: boolean,
	kanzlei: Kanzlei,
	akten: Akte[]
): [Role, boolean] {
	const domain = domainOf(email.senderAddress);
	if (email.channel === 'bea' && domain.split('.').some((label) => label.includes('justiz'))) {
		return ['court', true];
	}
	if (domain === kanzlei.domain) return ['internal', true];
	for (const akte of akten) {
		if (email.senderAddress === akte.mandant.address) return ['client', true];
		if (akte.gegenseite.addresses.includes(email.senderAddress)) return ['opponent', true];
	}
	return [llmRole, llmQuoteOk];
}

interface FristFacts {
	what: string;
	trigger: Trigger;
	dateText: string;
	lengthText: string;
	quote: string;
	quoteOk: boolean;
	status: Status | 'from_event';
}

function buildFrist(f: FristFacts, email: Email, role: Role, today: Day, land: Kanzlei['land']): Frist {
	const computed = compute(f.trigger, f.dateText, f.lengthText, email.receivedDay, land);
	let hint = '';
	if (computed.end === null && f.trigger === 'zustellung' && email.channel === 'bea') {
		hint = eebHint(f.lengthText, today, land);
	} else if (f.trigger === 'zugang') {
		hint = 'Zugangsdatum prüfen';
	} else if (f.trigger === 'stated_date' && computed.rawEnd && computed.end && computed.rawEnd !== computed.end) {
		hint = movedDateHint(computed.rawEnd, computed.end, role === 'court');
	}
	const counted = f.trigger === 'stated_date' ? computed.rawEnd : computed.end;
	return {
		what: f.what,
		trigger: f.trigger,
		quote: f.quote,
		quoteOk: f.quoteOk,
		status: f.status,
		lengthText: f.lengthText,
		emailId: email.id,
		source: 'email',
		...computed,
		hint,
		daysLeft: counted ? daysBetween(today, counted) : null
	};
}

const GERMAN_DATE = /\d{2}\.\d{2}\.\d{4}/g;
const MOVED = /verleg|verschob|aufgehoben/i;

/** `what` is the LLM's free text, outside the quote. So its old date counts only if the email's body holds it. */
function withOldDate(event: Facts['events'][number], body: string): ItemEvent {
	const dates = MOVED.test(event.what) ? (event.what.match(GERMAN_DATE) ?? []) : [];
	return { ...event, oldDate: dates.find((date) => body.includes(date) && !event.date_text.includes(date)) ?? null };
}

export function blankItem(): Item {
	return {
		emails: [],
		role: 'other',
		roleSure: true,
		summary: '',
		summaryQuotes: [],
		aktenzeichen: '',
		fristen: [],
		fristEvent: false,
		urgent: false,
		wvToday: false,
		injection: false,
		events: [],
		facts: null,
		unsicher: [],
		akte: null,
		akteRecord: null,
		akteFristSoon: false
	};
}

export function buildItem(
	email: Email,
	facts: Facts,
	checks: Record<string, boolean>,
	kanzlei: Kanzlei,
	today: Day,
	akten: Akte[] = []
): Item {
	const [role, roleSure] = resolveRole(email, facts.sender_role.value, checks.sender_role, kanzlei, akten);
	const fristen = facts.fristen.flatMap((f, i) =>
		f.status === 'not_found'
			? []
			: [
					buildFrist(
						{
							what: f.what,
							trigger: f.trigger,
							dateText: f.trigger_date_text,
							lengthText: f.length_text,
							quote: f.quote,
							quoteOk: checks[`fristen[${i}]`],
							status: f.status
						},
						email,
						role,
						today,
						kanzlei.land
					)
				]
	);
	const event = facts.frist_event;
	const eventFrist = EVENT_FRISTEN[event.kind];
	if (event.present && eventFrist) {
		fristen.push(
			buildFrist(
				{
					what: eventFrist,
					trigger: 'zugang',
					dateText: event.date_text,
					lengthText: event.kind === 'kuendigung' ? `${KSCHG_LENGTH[0]} Wochen` : '',
					quote: event.quote,
					quoteOk: checks.frist_event,
					status: 'from_event'
				},
				email,
				role,
				today,
				kanzlei.land
			)
		);
	}
	return {
		...blankItem(),
		emails: [email],
		role,
		roleSure,
		summary: facts.summary.text,
		summaryQuotes: facts.summary.quotes,
		aktenzeichen: facts.aktenzeichen.value,
		fristen,
		fristEvent: event.present,
		urgent: facts.urgent_request.present,
		wvToday: facts.wiedervorlage_today.present,
		injection: facts.injection_suspect.present,
		events: facts.events.map((event) => withOldDate(event, email.body)),
		facts,
		unsicher: Object.entries(checks)
			.filter(([, ok]) => !ok)
			.map(([path]) => path)
			.sort()
	};
}

/** An open Frist in `akten.json` that ends soon: its own item in tier 5, with no email. */
export function akteItem(akte: Akte, frist: OpenFrist): Item {
	return {
		...blankItem(),
		role: 'internal',
		summary: `Frist aus der Akte: ${frist.what}`,
		fristen: [
			{
				what: frist.what,
				trigger: 'akte',
				quote: '',
				quoteOk: true,
				status: 'found',
				lengthText: '',
				emailId: null,
				source: 'akte',
				end: frist.end,
				rawEnd: frist.end,
				relative: false,
				reason: '',
				hint: `notiert aus der ${frist.noted_from}`,
				daysLeft: frist.daysLeft
			}
		],
		akte: akte.aktenzeichen,
		akteRecord: akte,
		akteFristSoon: true
	};
}
