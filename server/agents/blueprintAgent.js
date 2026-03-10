import { callGemini, listFiles } from './tools.js';
import { clearMemory } from './memory.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a Blueprint Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a prototype's code files and produce a structured BLUEPRINT — a living document capturing everything important about this prototype so that other AI agents can understand and merge it intelligently.

You will receive the branch name, an optional parent branch name, and all code files.

Respond with ONLY valid JSON. No markdown fences, no explanation — just the raw JSON object.

JSON structure:
{
  "title": "Short descriptive title (what the prototype IS, not the branch name — e.g. 'Dark Mode Landing Page' not 'dark-mode-v2')",
  "summary": "One sentence describing what the user sees — visual first (e.g. 'Dark navy landing page with hero section, 3-column feature grid, and pricing table')",
  "purpose": "1-2 sentences: what is this prototype exploring or testing?",
  "techStack": ["array of detected technologies, e.g. 'HTML', 'CSS', 'Vanilla JS', 'Google Fonts: Inter'"],
  "fileStructure": [
    { "path": "index.html", "description": "what this file contains and does" }
  ],
  "features": [
    {
      "id": "kebab-case-unique-id",
      "name": "Human-readable feature name",
      "description": "What this feature does in 1-2 sentences. Focus on function, not DOM structure.",
      "files": ["files that implement this feature"],
      "dependencies": ["ids of other features this depends on — empty array if none"],
      "visualRegion": { "selector": "CSS selector or element tag that wraps this feature", "label": "Short label shown on visual overlay" }
    }
  ],
  "designTokens": {
    "primaryColor": "#hex value of the main brand/accent color",
    "backgroundColor": "#hex value of the page background",
    "textColor": "#hex value of primary text",
    "fontFamily": "primary font family name"
  },
  "changeHistory": ["Initial creation from parent branch"],
  "parent": null
}

For features: identify semantic sections like Navigation, Hero, Features Grid, Pricing, Testimonials, Footer, Authentication, etc. Each section the user would recognize as a distinct piece of the UI is a feature. Don't create features for utility code.`;

export async function runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey }) {
  const agentId = `blueprint_${branchId}_${Date.now()}`;

  try {
    const fileList = listFiles(files);
    const fileDump = files
      .map((f) => `=== ${f.path} ===\n${f.content.slice(0, 10000)}`)
      .join('\n\n');

    const userMessage = `Branch: "${branchName}"
${parentBranchName ? `Parent branch: "${parentBranchName}"` : 'Root branch (no parent)'}
Files: ${fileList.join(', ')}

${fileDump}

Generate the BLUEPRINT JSON now.`;

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I will analyze the code and output valid JSON only.' }] },
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const raw = await callGemini(apiKey, MODEL, contents, {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    });

    // Parse — responseMimeType: application/json means Gemini returns raw JSON
    let blueprint;
    try {
      blueprint = JSON.parse(raw);
    } catch {
      // Fallback: extract JSON from response if it got wrapped in markdown
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in blueprint response');
      blueprint = JSON.parse(match[0]);
    }

    // Timestamp — used for drift detection
    blueprint.generatedAt = Date.now();

    // Set parent relationship
    blueprint.parent = parentBranchName
      ? { branch: parentBranchName, relationship: 'Direct child' }
      : null;

    // Generate raw markdown for human display
    blueprint.raw = buildMarkdown(blueprint, branchName);

    return { success: true, blueprint };
  } catch (err) {
    console.error('[BlueprintAgent] error:', err.message);
    return { success: false, error: err.message };
  } finally {
    clearMemory(agentId);
  }
}

function buildMarkdown(bp, branchName) {
  const lines = [
    `# ${bp.title}`,
    ``,
    `> ${bp.summary}`,
    ``,
    `## Purpose`,
    bp.purpose,
    ``,
    `## Tech Stack`,
    ...bp.techStack.map((t) => `- ${t}`),
    ``,
    `## File Structure`,
    ...bp.fileStructure.map((f) => `- \`${f.path}\` — ${f.description}`),
    ``,
    `## Features & Components`,
    ...bp.features.map((f) => `- **${f.name}** — ${f.description}`),
    ``,
    `## Design Tokens`,
    ...Object.entries(bp.designTokens).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Change History`,
    ...bp.changeHistory.map((c, i) => `${i + 1}. ${c}`),
  ];

  if (bp.parent) {
    lines.push(``, `## Parent`, `- **Branch:** ${bp.parent.branch}`, `- **Relationship:** ${bp.parent.relationship}`);
  }

  return lines.join('\n');
}
