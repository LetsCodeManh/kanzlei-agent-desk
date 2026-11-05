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
