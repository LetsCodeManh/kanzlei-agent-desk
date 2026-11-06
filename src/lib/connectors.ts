/**
 * What the Postfach could still connect. Simulated: adding one only notes it in `out/mailbox.json`. No mail comes from it,
 * because `loadInbox` is the only code that reads mail. The interface for a second real connector comes with that connector.
 */
export const ADDABLE = [
	{ id: 'google', name: 'Google Workspace', line: 'Gmail mit der Domain der Kanzlei.' },
	{ id: 'imap', name: 'IMAP', line: 'Das Postfach beim eigenen Mail-Anbieter.' }
] as const;

export type AddableId = (typeof ADDABLE)[number]['id'];

export function isAddable(id: unknown): id is AddableId {
	return ADDABLE.some((connector) => connector.id === id);
}
