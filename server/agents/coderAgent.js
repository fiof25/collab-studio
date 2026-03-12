import { readFileSync } from 'fs';
import { callModel } from './tools.js';
import { config } from '../config/models.js';

// Load COLLABSTUDIO.md at module init
let CODER_SYSTEM = '';
try {
  CODER_SYSTEM = readFileSync(new URL('../../COLLABSTUDIO.md', import.meta.url), 'utf8');
} catch {
  CODER_SYSTEM = 'You are a world-class UI engineer. Produce a complete, self-contained HTML file. No markdown fences. No explanatory text.';
}

function stripMarkdownFences(text) {
  let t = text.trim();
  // Remove ```html ... ``` wrappers (greedy — grab the LAST closing fence)
  const match = t.match(/```html\s*\n([\s\S]*)```\s*$/);
  if (match) return match[1].trim();
  // Also try generic fences
  const generic = t.match(/```\s*\n?([\s\S]*)```\s*$/);
  if (generic) return generic[1].trim();
  // Handle opening fence without closing fence (Gemini sometimes omits it)
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:html)?\s*\n?/, '');
  }
  return t.trim();
}

// Max output tokens per provider — use the highest the model supports
const MAX_TOKENS = {
  gemini: 65536,
  claude: 16384,
};

const MAX_CONTINUATIONS = 3;

export async function runCoderAgent({ instructions, currentCode, tier, apiKey }) {
  try {
    const model = config.models[tier] || config.models.large;
    const maxTokens = MAX_TOKENS[config.provider] ?? 16384;
    console.log(`[coder] Calling ${model} (maxTokens=${maxTokens})...`);

    let userContent = `## Instructions\n${instructions}\n`;
    if (currentCode) {
      userContent += `\n## Current Code (modify this)\n\`\`\`html\n${currentCode}\n\`\`\``;
    }

    // Initial generation
    const messages = [{ role: 'user', content: userContent }];
    let result = await callModel(apiKey, model, {
      system: CODER_SYSTEM,
      messages,
    }, { temperature: 1, maxOutputTokens: maxTokens, richResponse: true });

    let accumulated = result.text;
    console.log(`[coder] Initial: ${accumulated.length} chars, truncated=${result.truncated}`);

    // Continuation loop — if the model hit the token limit, ask it to keep going
    let continuations = 0;
    while (result.truncated && continuations < MAX_CONTINUATIONS) {
      continuations++;
      console.log(`[coder] Continuation ${continuations}/${MAX_CONTINUATIONS}...`);

      const continueMessages = [
        { role: 'user', content: userContent },
        { role: 'assistant', content: accumulated },
        { role: 'user', content: 'Your response was cut off. Continue EXACTLY where you left off. Do NOT repeat any code already written. Do NOT add any explanation. Output ONLY the remaining code.' },
      ];

      result = await callModel(apiKey, model, {
        system: CODER_SYSTEM,
        messages: continueMessages,
      }, { temperature: 1, maxOutputTokens: maxTokens, richResponse: true });

      accumulated += result.text;
      console.log(`[coder] After continuation ${continuations}: ${accumulated.length} chars, truncated=${result.truncated}`);
    }

    if (result.truncated) {
      console.warn(`[coder] Still truncated after ${MAX_CONTINUATIONS} continuations (${accumulated.length} chars)`);
    }

    const html = stripMarkdownFences(accumulated);
    console.log(`[coder] After strip: ${html.length} chars`);
    if (!html) return { success: false, html: '', error: 'AI returned empty response' };
    return { success: true, html };
  } catch (err) {
    console.error(`[coder] CRASHED:`, err);
    return { success: false, html: '', error: err.message };
  }
}
