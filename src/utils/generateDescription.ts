const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-2.5-flash';

// Gemini 2.5 Flash returns thinking tokens as parts[0] (thought: true).
// Skip those and join the actual response parts.
function extractText(json: unknown): string {
  const parts: Array<{ thought?: boolean; text?: string }> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (json as any)?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('');
}

export interface BlendBranchInput {
  name: string;
  code: string;
  notes: string;
}

export async function blendHtml(branches: BlendBranchInput[]): Promise<string | null> {
  if (!GEMINI_KEY) return null;

  const branchBlocks = branches
    .map(
      (b, i) =>
        `PROTOTYPE ${i + 1} — "${b.name}":\n\`\`\`html\n${b.code.slice(0, 6000)}\n\`\`\`` +
        (b.notes ? `\nUser notes: ${b.notes}` : '')
    )
    .join('\n\n');

  const prompt = `You are a vibe coding AI. Blend these ${branches.length} HTML prototypes into one new unified page.

CRITICAL RULES:
- Each prototype may have "Take specifically: ..." instructions — you MUST honour these exactly. If it says "Take specifically: Background", use that prototype's background color/style. If it says "Take specifically: Text color", use that prototype's text colors. Etc.
- If no specific instructions are given for a prototype, use your judgement about what to combine
- DO NOT add any new content, copy, sections, or features that don't exist in the originals — only blend what's already there
- DO NOT add placeholder or explanatory text like "Welcome to your blended page" — use the actual content from the prototypes
- Return ONLY the complete blended HTML file in a \`\`\`html block — nothing else before or after
- Keep all styles in a <style> tag. No external CSS frameworks.
- The result must look like a real, polished page — not a crude paste

${branchBlocks}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = extractText(json);
    // Permissive regex: handles optional space/newline after ```html
    const match = text.match(/```html\s*\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

