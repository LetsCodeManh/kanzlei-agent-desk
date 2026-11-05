import { describe, expect, it } from 'vitest';
import { errors, type Schema } from '#lib/server/briefing/schema.ts';

const SCHEMA: Schema = {
	type: 'object',
	properties: {
		role: { type: 'string', enum: ['court', 'client'] },
		present: { type: 'boolean' }
	},
	required: ['role', 'present'],
	additionalProperties: false
};

describe('errors', () => {
	it('finds nothing in a valid value', () => {
		expect(errors({ role: 'court', present: false }, SCHEMA)).toEqual([]);
	});

	it('names a missing key', () => {
		expect(errors({ role: 'court' }, SCHEMA)).toEqual(['$: missing present']);
	});

	it('names an unexpected key: the LLM must never output an end date', () => {
		expect(errors({ role: 'court', present: true, end_date: 'x' }, SCHEMA)).toEqual(['$: unexpected end_date']);
	});

	it('names a value outside the enum', () => {
		expect(errors({ role: 'judge', present: true }, SCHEMA)).toHaveLength(1);
		expect(errors({ role: 'judge', present: true }, SCHEMA)[0]).toMatch(/^\$\.role: "judge" not in/);
	});
});
