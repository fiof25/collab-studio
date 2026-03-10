import { callGemini } from './tools.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool called Collab Studio.

Your job: read a web prototype's code and generate a SHORT visual description for display on a canvas card.

Rules:
- Describe what the user SEES, not the code — visual first
- 10–20 words max
- Mention: color palette, layout type, key sections visible
- Examples:
  - "Dark navy SaaS landing page with sticky nav, hero, 3-column features, and pricing"
  - "White minimal portfolio with centered hero, project grid, and contact form"
  - "Gradient purple dashboard with sidebar nav, metric cards, and data table"
- No technical jargon (no 'CSS', 'div', 'HTML', 'inline styles')
- No quotes in output

Respond with ONLY the description. No punctuation at the end. No quotes.`;

export async function runSnapshotAgent({ branchName, files, apiKey }) {
  try {
    // Use index.html or the first file
    const mainFile = files.find((f) => f.path === 'index.html') ?? files[0];
    if (!mainFile) return { success: false, error: 'No files to analyze' };

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Ready. I will describe what the user sees in 10–20 words.' }] },
      {
        role: 'user',
        parts: [{ text: `Branch: "${branchName}"\n\n${mainFile.content.slice(0, 8000)}` }],
      },
    ];

    const description = await callGemini(apiKey, MODEL, contents, {
      temperature: 0.3,
      maxOutputTokens: 80,
    });

    return { success: true, description: description.trim() };
  } catch (err) {
    console.error('[SnapshotAgent] error:', err.message);
    return { success: false, error: err.message };
  }
}
