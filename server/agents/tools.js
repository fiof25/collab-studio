import Anthropic from '@anthropic-ai/sdk';

// Shared tool implementations available to agents.
// In Phase 2, files are passed in the request payload (not read from disk).
// In later phases, these will expand to read from a project file store.

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
 * Helper: call Claude (non-streaming) for background agents.
 * @param {string} apiKey  - Anthropic API key
 * @param {string} model   - Claude model ID
 * @param {{ system?: string, messages: Array }} payload
 * @param {{ temperature?: number, maxOutputTokens?: number }} params
 */
export async function callClaude(apiKey, model, { system, messages }, params = {}) {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: params.maxOutputTokens ?? 8192,
    temperature: params.temperature ?? 0.7,
    ...(system ? { system } : {}),
    messages,
  });
  return msg.content[0]?.text ?? '';
}
