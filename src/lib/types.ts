/** A calendar day as `YYYY-MM-DD`. Compared and stored as text, computed in UTC only (`frist.ts`). */
export type Day = string;

export type Role = 'court' | 'client' | 'opponent' | 'internal' | 'other';
export type Trigger = 'zustellung' | 'zugang' | 'stated_date';
export type Status = 'found' | 'unsure' | 'not_found';
export type EventKind = 'kuendigung' | 'mahnbescheid' | 'klage' | 'other';

export interface Flag {
	present: boolean;
	quote: string;
}

/** The LLM's output for one email. Its names are the schema's, so they stay in snake case. */
export interface Facts {
	summary: { text: string; quotes: string[] };
	sender_role: { value: Role; quote: string };
	aktenzeichen: { value: string; quote: string };
	fristen: {
		what: string;
		trigger: Trigger;
		trigger_date_text: string;
		length_text: string;
		quote: string;
		status: Status;
	}[];
	frist_event: { present: boolean; kind: EventKind; date_text: string; quote: string };
	urgent_request: Flag;
	wiedervorlage_today: Flag;
	events: { what: string; date_text: string; quote: string }[];
	injection_suspect: Flag;
}

export type Channel = 'bea' | 'email';
export type Land = 'BE' | 'BY';

/** A message from the connector. Microsoft Graph's shape stays in `connector.ts`. */
export interface Email {
	id: string;
	channel: Channel;
	/** ISO 8601 with an offset and no `Z`. The prompt's `Received:` line holds it, so it is in the replay key. */
	received: string;
	/** The German calendar day it arrived. Fristen count in local days, and `receivedDateTime` is UTC. */
	receivedDay: Day;
	senderName: string;
	/** Lower case, so it compares with `akten.json`. */
	senderAddress: string;
	subject: string;
	body: string;
}

export interface Kanzlei {
	name: string;
	land: Land;
	domain: string;
	anwalt: { name: string; address: string };
	simulated_today: Day;
}

/** One entry of `akten.json`. Its names are the file's, so they stay in snake case. */
export interface Akte {
	aktenzeichen: string;
	az_gericht: string;
	gericht: string;
	mandant: { name: string; address: string };
	gegenseite: { name: string; addresses: string[] };
	fristen: { what: string; end: Day; noted_from: string }[];
	termine: { what: string; date: Day; time: string; room: string }[];
	last_contact: Day;
}

export interface Frist {
	what: string;
	trigger: Trigger | 'akte';
	quote: string;
	quoteOk: boolean;
	status: Status | 'from_event';
	lengthText: string;
	/** null for a Frist from `akten.json`, which has no email. */
	emailId: string | null;
	source: 'email' | 'akte';
	end: Day | null;
	rawEnd: Day | null;
	relative: boolean;
	reason: string;
	hint: string;
	/** To `rawEnd` for a stated date, which may not move. To `end` for a computed one. */
	daysLeft: number | null;
}

export type ItemEvent = Facts['events'][number] & {
	/** A moved hearing's old date, found in the email's body. Show this, not a date in `what`, which is unchecked. */
	oldDate: string | null;
};

export interface Item {
	emails: Email[];
	role: Role;
	/** false when only the LLM names the role, and its quote failed. */
	roleSure: boolean;
	summary: string;
	summaryQuotes: string[];
	aktenzeichen: string;
	fristen: Frist[];
	fristEvent: boolean;
	urgent: boolean;
	wvToday: boolean;
	injection: boolean;
	events: ItemEvent[];
	facts: Facts | null;
	/** The paths of the facts whose quote was not found in the email. */
	unsicher: string[];
	akte: string | null;
	akteRecord: Akte | null;
	akteFristSoon: boolean;
}

export interface RankedItem extends Item {
	tier: number;
	/** The items merged into this one, because they hold the same Frist. */
	duplicates?: RankedItem[];
}

/** An email that could not be read. A silently dropped email is the worst failure, so it is counted and listed. */
export interface NotRead {
	/** The file's name when the file itself could not be read. */
	id: string;
	sender: string;
	subject: string;
	reason: string;
	/** The error, for the operator. It does not go in `briefing.json`. */
	detail: string;
}

export interface Coverage {
	read: number;
	notRead: number;
}

export interface HeuteLine {
	text: string;
	/** Empty for a line from `akten.json`, which has no email. */
	emailIds: string[];
}

export interface Heute {
	termine: HeuteLine[];
	anrufen: HeuteLine[];
	pruefen: HeuteLine[];
	bald: HeuteLine[];
}

/** `data/<kanzlei>/out/briefing.json`. The screens read this. */
export interface Briefing {
	kanzlei: string;
	info: Kanzlei;
	today: Day;
	model: string;
	coverage: Coverage;
	notRead: Omit<NotRead, 'detail'>[];
	heute: Heute;
	items: RankedItem[];
}
