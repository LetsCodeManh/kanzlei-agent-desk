import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callLlm } from '#lib/server/briefing/llm.ts';
import type { Schema } from '#lib/server/briefing/schema.ts';

const SCHEMA: Schema = { type: 'object', properties: { a: { type: 'string' } } };
const REPLY = {
	is_error: false,
	structured_output: { a: 'b' },
	duration_ms: 12,
	total_cost_usd: 0.5,
	usage: { input_tokens: 1, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: 4 }
};

/** A fake `claude`, alone on the PATH, so no test can reach the real one. It logs what it got to a file. */
const FAKE = `#!${process.execPath}
const fs = require('node:fs');
const stdin = fs.readFileSync(0, 'utf-8');
fs.writeFileSync(process.env.FAKE_LOG, JSON.stringify({
	argv: process.argv.slice(2),
	cwd: process.cwd(),
	cwdFiles: fs.readdirSync(process.cwd()),
	disableClaudeMds: process.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS,
	stdin
}));
if (process.env.FAKE_HANG) setInterval(() => {}, 1000);
else {
	process.stdout.write(process.env.FAKE_STDOUT);
	process.stderr.write(process.env.FAKE_STDERR ?? '');
	process.exitCode = Number(process.env.FAKE_EXIT ?? 0);
}
`;

let bin: string;
let log: string;

beforeEach(() => {
	bin = mkdtempSync(join(tmpdir(), 'fake-claude-'));
	log = join(bin, 'log.json');
	writeFileSync(join(bin, 'claude'), FAKE);
	chmodSync(join(bin, 'claude'), 0o755);
	vi.stubEnv('PATH', bin);
	vi.stubEnv('FAKE_LOG', log);
	vi.stubEnv('FAKE_STDOUT', JSON.stringify(REPLY));
});

afterEach(() => {
	vi.unstubAllEnvs();
	rmSync(bin, { recursive: true });
});

const seen = () => JSON.parse(readFileSync(log, 'utf-8'));
const call = () => callLlm('the prompt', SCHEMA, 'claude-sonnet-5-5', 'the system');

describe('callLlm, against a fake claude', () => {
	it('returns the output and the usage', async () => {
		expect(await call()).toEqual({
			output: { a: 'b' },
			meta: { model: 'claude-sonnet-5-5', duration_ms: 12, cost_usd: 0.5, input_tokens: 6, output_tokens: 4 }
		});
	});

	it('sends the prompt on stdin, not in the arguments', async () => {
		await call();
		expect(seen().stdin).toBe('the prompt');
		expect(seen().argv).not.toContain('the prompt');
	});

	it('passes the schema, the model and the system prompt', async () => {
		await call();
		const { argv } = seen();
		expect(argv[argv.indexOf('--json-schema') + 1]).toBe(JSON.stringify(SCHEMA));
		expect(argv[argv.indexOf('--model') + 1]).toBe('claude-sonnet-5-5');
		expect(argv[argv.indexOf('--system-prompt') + 1]).toBe('the system');
		expect(argv[argv.indexOf('--output-format') + 1]).toBe('json');
		expect(argv).toContain('-p');
	});

	it('keeps tools, sessions, MCP and CLAUDE.md files out', async () => {
		await call();
		const { argv, disableClaudeMds } = seen();
		expect(argv[argv.indexOf('--tools') + 1]).toBe('');
		expect(argv[argv.indexOf('--setting-sources') + 1]).toBe('');
		expect(argv).toContain('--no-session-persistence');
		expect(argv).toContain('--strict-mcp-config');
		expect(disableClaudeMds).toBe('1');
	});

	it('runs in an empty temp folder, and removes it', async () => {
		await call();
		const { cwd, cwdFiles } = seen();
		expect(cwdFiles).toEqual([]);
		expect(cwd.startsWith(realpathSync(tmpdir()))).toBe(true);
		expect(existsSync(cwd)).toBe(false);
	});

	it('trusts is_error: a refused call still says subtype "success"', async () => {
		vi.stubEnv('FAKE_STDOUT', JSON.stringify({ ...REPLY, subtype: 'success', is_error: true, result: 'refused' }));
		await expect(call()).rejects.toThrow(/no structured output: refused/);
	});

	it('fails on a reply with no structured output', async () => {
		vi.stubEnv('FAKE_STDOUT', JSON.stringify({ ...REPLY, structured_output: null, result: 'prose' }));
		await expect(call()).rejects.toThrow(/no structured output: prose/);
	});

	it('fails on a non-zero exit, with its stderr', async () => {
		vi.stubEnv('FAKE_EXIT', '3');
		vi.stubEnv('FAKE_STDERR', 'please log in');
		await expect(call()).rejects.toThrow(/exited 3: please log in/);
	});

	it('names the fix when claude is not on the PATH', async () => {
		vi.stubEnv('PATH', join(bin, 'nothing-here'));
		await expect(call()).rejects.toThrow(/`claude` not found on PATH/);
	});

	it('stops a call that hangs', async () => {
		vi.stubEnv('FAKE_HANG', '1');
		await expect(
			callLlm('p', SCHEMA, 'm', 's', { timeoutMs: 300 })
		).rejects.toThrow(/timed out after 300 ms/);
	});
});
