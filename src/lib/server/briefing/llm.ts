/**
 * The one function that calls a model. Production swaps it for the Anthropic SDK with an API key.
 *
 * `claude -p` loads the user's CLAUDE.md files, hooks and plugins unless told not to (`docs/DESIGN.md`, "What reaches
 * the model"). So it runs with both switches, and in an empty temp folder, because this repo holds CLAUDE.md files.
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Schema } from './schema.ts';

const TIMEOUT_MS = 300_000;
const MAX_REPLY_BYTES = 10 * 1024 * 1024;

export class LlmError extends Error {}

export interface LlmMeta {
	model: string;
	duration_ms: number | null;
	cost_usd: number | null;
	input_tokens: number;
	output_tokens: number;
}

export interface LlmResult {
	output: unknown;
	meta: LlmMeta;
}

interface Process {
	error: { code?: string | number | null; killed?: boolean } | null;
	stdout: string;
	stderr: string;
}

function run(args: string[], prompt: string, cwd: string, timeoutMs: number): Promise<Process> {
	return new Promise((resolve) => {
		let stdinError: NodeJS.ErrnoException | null = null;
		const child = execFile(
			'claude',
			args,
			{
				cwd,
				timeout: timeoutMs,
				maxBuffer: MAX_REPLY_BYTES,
				env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' }
			},
			(error, stdout, stderr) => resolve({ error: error ?? stdinError, stdout, stderr })
		);
		// A claude that exits before it reads the prompt breaks the pipe. Its reply answers no prompt, so that fails too.
		child.stdin?.on('error', (error) => (stdinError = error));
		child.stdin?.end(prompt);
	});
}

function clip(text: unknown): string {
	return String(text).trim().slice(0, 500);
}

function parseReply({ stdout }: Process, model: string): LlmResult {
	let out;
	try {
		out = JSON.parse(stdout);
	} catch {
		throw new LlmError(`claude -p replied with something that is not JSON: ${clip(stdout)}`);
	}
	// A refusal or an API error still says subtype "success": is_error is the field to trust.
	if (out.is_error || out.structured_output == null) {
		throw new LlmError(`claude -p returned no structured output: ${clip(out.result)}`);
	}
	const usage = out.usage ?? {};
	return {
		output: out.structured_output,
		meta: {
			model,
			duration_ms: out.duration_ms ?? null,
			cost_usd: out.total_cost_usd ?? null,
			input_tokens:
				(usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
			output_tokens: usage.output_tokens ?? 0
		}
	};
}

/** One `claude -p` call with structured output. `cwd` is for the canary check alone. */
export async function callLlm(
	prompt: string,
	schema: Schema,
	model: string,
	system: string,
	{ timeoutMs = TIMEOUT_MS, cwd }: { timeoutMs?: number; cwd?: string } = {}
): Promise<LlmResult> {
	const args = [
		'-p',
		'--output-format', 'json',
		'--json-schema', JSON.stringify(schema),
		'--model', model,
		'--system-prompt', system,
		'--tools', '',
		'--no-session-persistence',
		'--setting-sources', '',
		'--strict-mcp-config'
	];
	const empty = cwd ? null : mkdtempSync(join(tmpdir(), 'briefing-llm-'));
	try {
		const result = await run(args, prompt, cwd ?? (empty as string), timeoutMs);
		if (result.error?.code === 'ENOENT') {
			throw new LlmError('`claude` not found on PATH. Replay mode needs no login: unset BRIEFING_LIVE.');
		}
		// A reply over MAX_REPLY_BYTES is killed too, but it has a code.
		if (result.error?.killed && result.error.code == null) {
			throw new LlmError(`claude -p timed out after ${timeoutMs} ms`);
		}
		if (result.error) {
			throw new LlmError(`claude -p exited ${result.error.code}: ${clip(result.stderr) || clip(result.stdout)}`);
		}
		return parseReply(result, model);
	} finally {
		if (empty) rmSync(empty, { recursive: true, force: true });
	}
}
