import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/models.js';
import { callGemini, streamGemini } from '../providers/gemini.js';

/** Read a specific file's content by path */
export function readFile(files, path) {
  return files.find((f) => f.path === path)?.content ?? null;
}

/** List all file paths in the branch */
export function listFiles(files) {
  return files.map((f) => f.path);
}

/** Search for a regex pattern across all files; returns matches per file */
export function searchCode(files, pattern) {
  const regex = new RegExp(pattern, 'gi');
  return files.flatMap((f) => {
    const matches = f.content.match(regex) ?? [];
    return matches.length > 0 ? [{ path: f.path, matches }] : [];
  });
}

/**
 * Helper: call the active AI provider (non-streaming) for background agents.
 * Branches by config.provider to use Claude or Gemini.
 */
export async function callModel(apiKey, model, payload, params = {}) {
  if (config.provider === 'gemini') {
    return callGemini(apiKey, model, payload, params);
  }
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: params.maxOutputTokens ?? 8192,
    temperature: params.temperature ?? 0.7,
    ...(payload.system ? { system: payload.system } : {}),
    messages: payload.messages,
  });
  return msg.content[0]?.text ?? '';
}

/**
 * Streaming call to the active AI provider. Yields text chunks.
 */
export async function* streamModel(apiKey, model, payload, params = {}) {
  if (config.provider === 'gemini') {
    yield* streamGemini(apiKey, model, payload, params);
    return;
  }
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.stream({
    model,
    max_tokens: params.maxOutputTokens ?? 8192,
    temperature: params.temperature ?? 0.7,
    ...(payload.system ? { system: payload.system } : {}),
    messages: payload.messages,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

/**
 * Parse JSON that may be wrapped in markdown code fences (common with Gemini).
 * Strips ```json ... ``` or ``` ... ``` before parsing.
 */
export function parseJSON(raw) {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/** Backward-compatible alias */
export const callClaude = callModel;
