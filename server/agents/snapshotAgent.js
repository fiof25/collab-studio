import { callClaude } from './tools.js';

const MODEL = 'claude-haiku-4-5-20251001';

const CONVERSATION_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool.

A user just asked an AI to make a change to their web prototype. Your job: write a SHORT description for the canvas node that accurately captures the most salient thing that changed in this iteration.

Rules:
- Lead with the KEY CHANGE from this iteration — not a generic page description
- 8–16 words max
- Be specific: name the actual UI element, feature, or visual change
- Examples of GOOD descriptions (iteration-aware):
  - "Added dark sidebar nav with icon links and collapsed state"
  - "Switched hero to split layout with product screenshot on right"
  - "Added pricing section with 3-tier cards and toggle for annual billing"
  - "Replaced placeholder copy with real SaaS content and updated color to indigo"
  - "Added interactive chart showing weekly revenue with hover tooltips"
- No technical jargon (no 'CSS', 'div', 'HTML')
- No quotes or trailing punctuation

Respond with ONLY the description.`;

const VISION_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool.

Look at this screenshot of a web prototype and write a SHORT visual description for a canvas card.

Rules:
- Describe what you SEE — layout, color palette, key UI sections
- 10–20 words max
- Examples:
  - "Dark navy SaaS landing page with sticky nav, hero, 3-column features, and pricing"
  - "White minimal portfolio with centered hero, project grid, and contact form"
  - "Gradient purple dashboard with sidebar nav, metric cards, and data table"
- No technical jargon
- No quotes or punctuation at the end

Respond with ONLY the description.`;

const CODE_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool called Collab Studio.

Your job: read a web prototype's code and generate a SHORT visual description for display on a canvas card.

Rules:
- Describe what the user SEES, not the code — visual first
- 10–20 words max
- Mention: color palette, layout type, key sections visible
- No technical jargon (no 'CSS', 'div', 'HTML', 'inline styles')
- No quotes in output

Respond with ONLY the description. No punctuation at the end. No quotes.`;

export async function runSnapshotAgent({ branchName, files, apiKey, screenshotBase64, userPrompt, aiSummary }) {
  try {
    let claudePayload;

    if (userPrompt || aiSummary) {
      // Conversation-based: most accurate — describes what actually changed this iteration
      const context = [
        userPrompt && `User request: "${userPrompt}"`,
        aiSummary && `AI summary of changes: "${aiSummary}"`,
      ].filter(Boolean).join('\n');

      claudePayload = {
        system: CONVERSATION_PROMPT,
        messages: [{ role: 'user', content: context }],
      };
    } else if (screenshotBase64) {
      // Vision-based fallback: describe the rendered screenshot
      claudePayload = {
        system: VISION_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: screenshotBase64 } },
            { type: 'text', text: `Branch: "${branchName}"` },
          ],
        }],
      };
    } else {
      // Last resort: describe from HTML source
      const mainFile = files.find((f) => f.path === 'index.html') ?? files[0];
      if (!mainFile) return { success: false, error: 'No files to analyze' };

      claudePayload = {
        system: CODE_PROMPT,
        messages: [{ role: 'user', content: `Branch: "${branchName}"\n\n${mainFile.content.slice(0, 8000)}` }],
      };
    }

    const description = await callClaude(apiKey, MODEL, claudePayload, {
      temperature: 0.3,
      maxOutputTokens: 80,
    });

    return { success: true, description: description.trim() };
  } catch (err) {
    console.error('[SnapshotAgent] error:', err.message);
    return { success: false, error: err.message };
  }
}
