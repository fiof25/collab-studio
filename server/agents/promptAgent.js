import { callModel, parseJSON } from './tools.js';
import { config } from '../config/models.js';

const SYSTEM = `You are a prompt translator for a code generation system. Your job is to convert a conversation between a user and an AI assistant into precise, detailed technical instructions for a coding agent.

The coding agent will NOT see the conversation — only your instructions. Be explicit about:
- Layout structure (sections, grids, flexbox, positioning)
- Colors, gradients, and visual style
- Typography (sizes, weights, fonts)
- Interactions (hover states, animations, click handlers, state management)
- What to PRESERVE from existing code (be specific)
- What to ADD or CHANGE

Output ONLY a JSON object:
{
  "instructions": "Detailed technical coding instructions...",
  "summary": "1-2 sentence plain-English summary of what's being built/changed"
}`;

export async function runPromptAgent({ messages, currentCode, blueprint, tier, apiKey }) {
  try {
    const model = config.models[tier] || config.models.large;
    console.log(`[prompt] Calling ${model}...`);

    let userContent = '';
    if (blueprint) {
      userContent += `## Blueprint Context\n${JSON.stringify(blueprint)}\n\n`;
    }
    if (currentCode) {
      userContent += `## Current Code\n\`\`\`html\n${currentCode}\n\`\`\`\n\n`;
    }
    userContent += `## Conversation\n`;
    for (const msg of messages) {
      userContent += `${msg.role}: ${msg.content}\n`;
    }

    const raw = await callModel(apiKey, model, {
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }, { temperature: 0.3, maxOutputTokens: 4096 });
    console.log(`[prompt] Raw response (${raw.length} chars): "${raw.slice(0, 120)}..."`);

    const parsed = parseJSON(raw);
    console.log(`[prompt] Parsed OK — instructions: ${parsed.instructions?.length ?? 0} chars, summary: "${parsed.summary?.slice(0, 60)}"`);
    return {
      success: true,
      instructions: parsed.instructions || raw,
      summary: parsed.summary || 'Building your request...',
    };
  } catch (err) {
    console.error(`[prompt] ERROR:`, err);
    // Fallback: use the last user message as instructions
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    return {
      success: true,
      instructions: lastUserMsg?.content || 'Build something creative',
      summary: lastUserMsg?.content?.slice(0, 100) || 'Building...',
    };
  }
}
