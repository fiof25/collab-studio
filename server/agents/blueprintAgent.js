import { callClaude, listFiles } from './tools.js';
import { clearMemory } from './memory.js';
import { config } from '../config/models.js';

const SYSTEM_PROMPT_FULL = `You are a Blueprint Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a prototype's code files and produce a structured BLUEPRINT — a semantic map that captures everything another AI agent needs to understand, merge, or extend this prototype.

You will receive the branch name, an optional parent branch name, all code files, and optionally the user's last message and AI response for intent context.

Respond with ONLY valid JSON. No markdown fences, no explanation — just the raw JSON object.

JSON structure:
{
  "title": "Short descriptive title (what the prototype IS, e.g. 'Physics Particle Simulator' not 'particle-v2')",
  "summary": "One sentence describing the prototype — what it does and what the user sees",
  "purpose": "1-2 sentences capturing the user's intent and what this prototype is exploring. Use conversation context if provided; otherwise derive from code analysis.",
  "architecture": {
    "pattern": "The application pattern in one phrase (e.g. 'Canvas-based game loop with score tracking', 'Form-driven SPA with modal login gate', 'Static landing page with scroll animations')",
    "initFlow": "What happens from page load to interactive state, as a chain (e.g. 'DOMContentLoaded → loadState() → renderBoard() → startLoop()')",
    "stateModel": [
      {
        "name": "variable name (e.g. 'score', 'isLoggedIn', 'particles')",
        "type": "data type (e.g. 'number', 'boolean', 'array of objects')",
        "scope": "where it lives (e.g. 'global', 'closure in initGame()', 'localStorage')",
        "purpose": "what it controls or tracks (e.g. 'Gates access to main app view')"
      }
    ],
    "eventModel": ["key event wirings as chains (e.g. 'form.submit → validate() → setLoggedIn(true)', 'canvas.click → spawnParticle(x, y)')"]
  },
  "features": [
    {
      "id": "kebab-case-unique-id",
      "name": "Human-readable feature name",
      "description": "What this feature does in 1-2 sentences. Focus on function, not DOM structure.",
      "behavior": "Concrete actions: what it DOES, what happens when the user interacts (e.g. 'Validates email format on blur, shows red border and error text for invalid input, submits via fetch POST to /api/auth, stores JWT in localStorage on success')",
      "state": ["names of state variables this feature owns or mutates"],
      "entryPoints": [
        {
          "type": "function | event | element | variable",
          "name": "identifier (e.g. 'showLoginModal()', 'onAuthSuccess', '#game-canvas')",
          "direction": "in | out | both",
          "description": "How other code interacts with this feature via this entry point"
        }
      ],
      "codeRegions": [
        {
          "file": "file path",
          "anchor": "searchable identifier — function name, CSS selector, or distinctive pattern that can be grepped (e.g. 'function validateLogin()', '.login-form', '// AUTH SECTION')",
          "label": "short description of what this region does"
        }
      ],
      "files": ["files that implement this feature"],
      "dependencies": ["ids of other features this depends on — empty array if none"],
      "visualRegion": { "selector": "CSS selector that wraps this feature visually", "label": "Short label for overlay" }
    }
  ],
  "techStack": ["detected technologies, e.g. 'HTML', 'CSS Grid', 'Vanilla JS', 'Google Fonts: Inter', 'Canvas API'"],
  "fileStructure": [
    { "path": "index.html", "description": "what this file contains and does" }
  ],
  "designTokens": {
    "primaryColor": "#hex value of main accent color",
    "backgroundColor": "#hex value of page background",
    "textColor": "#hex value of primary text",
    "fontFamily": "primary font family"
  },
  "changeHistory": ["Initial creation"],
  "parent": null
}

Critical rules:
- For architecture.pattern: identify what KIND of app this is — game loop, form flow, dashboard, simulator, static page, etc.
- For architecture.initFlow: trace the ACTUAL boot sequence from the code. Look for DOMContentLoaded, window.onload, or immediate script execution.
- For architecture.stateModel: find every variable that persists across user interactions. Include scope and purpose.
- For features: identify the distinct FUNCTIONAL units — adapt to whatever the prototype is. A game has different units than a form. Let the code tell you what the features are. Don't create features for utility code.
- For behavior: describe what HAPPENS, not what it LOOKS LIKE. Include user interactions, data transformations, and side effects.
- For entryPoints: identify how other code could plug INTO this feature (direction: "in") or what this feature EMITS (direction: "out"). This is critical for merge operations.
- For codeRegions: use searchable anchors — function names, CSS selectors, or distinctive code patterns. NEVER use line numbers.
- For state on features: list the state variable NAMES that this feature reads or writes.`;

const SYSTEM_PROMPT_INCREMENTAL = `You are a Blueprint Agent performing an INCREMENTAL UPDATE on an existing blueprint.

You receive:
- The existing blueprint JSON
- The current code files
- Optionally, the user's last message and AI response

Your job: compare the existing blueprint against the current code and update ONLY what changed. This could be:
- New features added
- Existing features modified (new behavior, changed state, new entry points)
- Architecture changes (new state variables, changed init flow, new event wiring)
- Updated purpose (if conversation context reveals new intent)

Respond with ONLY the complete updated blueprint JSON. Preserve unchanged fields exactly. Update changed fields accurately.

Rules:
- Do NOT regenerate unchanged features — keep their ids, names, and descriptions if the underlying code hasn't changed
- DO update codeRegions if anchors have moved or new ones appeared
- DO add new stateModel entries if new state variables appear in the code
- DO update changeHistory — append a brief description of what changed (e.g. "Added login form with validation")
- If conversation context is provided, update purpose to reflect the latest intent`;

export async function runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey, conversationContext, existingBlueprint, forceFullRegenerate }) {
  const agentId = `blueprint_${branchId}_${Date.now()}`;

  try {
    const fileList = listFiles(files);
    const fileDump = files
      .map((f) => `=== ${f.path} ===\n${f.content.slice(0, 10000)}`)
      .join('\n\n');

    // Tiered model selection:
    // Use large model for initial generation or when forced
    // Use small model for incremental updates (existing blueprint with architecture field)
    const isIncremental = !forceFullRegenerate && existingBlueprint?.architecture;
    const model = isIncremental ? config.models.small : config.models.large;
    const systemPrompt = isIncremental ? SYSTEM_PROMPT_INCREMENTAL : SYSTEM_PROMPT_FULL;

    let userMessage = `Branch: "${branchName}"
${parentBranchName ? `Parent branch: "${parentBranchName}"` : 'Root branch (no parent)'}
Files: ${fileList.join(', ')}`;

    // Add conversation context for intent
    if (conversationContext?.lastUserMessage) {
      userMessage += `\n\nUser's last message: "${conversationContext.lastUserMessage}"`;
    }
    if (conversationContext?.lastAIResponse) {
      userMessage += `\nAI's last response summary: "${conversationContext.lastAIResponse}"`;
    }

    // For incremental updates, include the existing blueprint
    if (isIncremental && existingBlueprint) {
      userMessage += `\n\nEXISTING BLUEPRINT:\n${JSON.stringify(existingBlueprint, null, 2)}`;
    }

    userMessage += `\n\n${fileDump}\n\nGenerate the BLUEPRINT JSON now.`;

    const raw = await callClaude(apiKey, model, {
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }, { temperature: 0.2, maxOutputTokens: isIncremental ? 4096 : 8192 });

    // Parse
    let blueprint;
    try {
      blueprint = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in blueprint response');
      blueprint = JSON.parse(match[0]);
    }

    // Timestamp
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
  ];

  // Architecture
  if (bp.architecture) {
    lines.push(``, `## Architecture`);
    lines.push(`- **Pattern:** ${bp.architecture.pattern}`);
    lines.push(`- **Init Flow:** \`${bp.architecture.initFlow}\``);
    if (bp.architecture.stateModel?.length) {
      lines.push(``, `### State Model`);
      bp.architecture.stateModel.forEach((s) => {
        lines.push(`- \`${s.name}\` (${s.type}, ${s.scope}) — ${s.purpose}`);
      });
    }
    if (bp.architecture.eventModel?.length) {
      lines.push(``, `### Event Model`);
      bp.architecture.eventModel.forEach((e) => lines.push(`- \`${e}\``));
    }
  }

  // Features
  if (bp.features?.length) {
    lines.push(``, `## Features`);
    bp.features.forEach((f) => {
      lines.push(``, `### ${f.name}`, f.description);
      if (f.behavior) lines.push(`- **Behavior:** ${f.behavior}`);
      if (f.state?.length) lines.push(`- **State:** ${f.state.join(', ')}`);
      if (f.entryPoints?.length) {
        lines.push(`- **Entry Points:**`);
        f.entryPoints.forEach((ep) => {
          lines.push(`  - \`${ep.name}\` [${ep.direction}] (${ep.type}) — ${ep.description}`);
        });
      }
      if (f.codeRegions?.length) {
        lines.push(`- **Code Regions:**`);
        f.codeRegions.forEach((cr) => {
          lines.push(`  - \`${cr.anchor}\` in ${cr.file} — ${cr.label}`);
        });
      }
    });
  }

  lines.push(
    ``,
    `## Tech Stack`,
    ...bp.techStack.map((t) => `- ${t}`),
    ``,
    `## File Structure`,
    ...bp.fileStructure.map((f) => `- \`${f.path}\` — ${f.description}`),
    ``,
    `## Design Tokens`,
    ...Object.entries(bp.designTokens).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Change History`,
    ...bp.changeHistory.map((c, i) => `${i + 1}. ${c}`),
  );

  if (bp.parent) {
    lines.push(``, `## Parent`, `- **Branch:** ${bp.parent.branch}`, `- **Relationship:** ${bp.parent.relationship}`);
  }

  return lines.join('\n');
}
