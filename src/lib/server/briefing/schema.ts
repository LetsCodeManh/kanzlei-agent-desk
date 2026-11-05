/**
 * A small JSON Schema check for the subset this repo uses: object, array, string, boolean, enum, required,
 * additionalProperties false. It runs on every LLM output, live or replayed, and on the files the connector reads.
 */
export type Schema =
	| { type: 'string'; enum?: string[] }
	| { type: 'boolean' }
	| { type: 'array'; items: Schema }
	| {
			type: 'object';
			properties: Record<string, Schema>;
			required?: string[];
			additionalProperties?: false;
	  };

function typeOf(value: unknown): string {
	if (value === null) return 'null';
	return Array.isArray(value) ? 'array' : typeof value;
}

/** Every way `value` breaks `schema`, each with its path. Empty when it is valid. */
export function errors(value: unknown, schema: Schema, path = '$'): string[] {
	if (!['object', 'array', 'string', 'boolean'].includes(schema.type)) {
		throw new TypeError(`unknown schema type: ${schema.type}`);
	}
	const actual = typeOf(value);
	if (actual !== schema.type) return [`${path}: expected ${schema.type}, got ${actual}`];

	if (schema.type === 'string') {
		const allowed = schema.enum;
		return allowed && !allowed.includes(value as string)
			? [`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(allowed)}`]
			: [];
	}
	if (schema.type === 'array') {
		return (value as unknown[]).flatMap((item, i) => errors(item, schema.items, `${path}[${i}]`));
	}
	if (schema.type === 'object') {
		const object = value as Record<string, unknown>;
		const out = (schema.required ?? []).filter((key) => !Object.hasOwn(object, key)).map((key) => `${path}: missing ${key}`);
		if (schema.additionalProperties === false) {
			for (const key of Object.keys(object)) {
				if (!Object.hasOwn(schema.properties, key)) out.push(`${path}: unexpected ${key}`);
			}
		}
		for (const [key, sub] of Object.entries(schema.properties)) {
			if (Object.hasOwn(object, key)) out.push(...errors(object[key], sub, `${path}.${key}`));
		}
		return out;
	}
	return [];
}
