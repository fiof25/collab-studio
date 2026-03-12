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
  // Remove ```html ... ``` wrappers if present
  const match = text.match(/```html\n([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Also try generic fences
  const generic = text.match(/```\n?([\s\S]*?)```/);
  if (generic) return generic[1].trim();
  return text.trim();
}

export async function runCoderAgent({ instructions, currentCode, tier, apiKey }) {
  try {
    const model = config.models[tier] || config.models.large;

    let userContent = `## Instructions\n${instructions}\n`;
    if (currentCode) {
      userContent += `\n## Current Code (modify this)\n\`\`\`html\n${currentCode}\n\`\`\``;
    }

    const raw = await callModel(apiKey, model, {
      system: CODER_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }, { temperature: 1, maxOutputTokens: 8192 });

    const html = stripMarkdownFences(raw);
    if (!html) return { success: false, html: '', error: 'AI returned empty response' };
    return { success: true, html };
  } catch (err) {
    return { success: false, html: '', error: err.message };
  }
}
