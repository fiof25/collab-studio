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

/** Helper: call Gemini generateContent (non-streaming) */
export async function callGemini(apiKey, model, contents, generationConfig = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Gemini ${response.status}: ${body}`);
  }
  const data = await response.json();
  // Filter out thinking tokens from Gemini 2.5
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('') ?? '';
  return text;
}
