import { callGemini, readFile } from './tools.js';
import { writeMemory, clearMemory } from './memory.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a Scout Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a SOURCE HTML prototype and a TARGET HTML prototype, identify what the user wants to migrate, and produce a merge plan with any necessary clarification questions.

You receive:
- Source BLUEPRINT (structured analysis of the source prototype, may be null)
- Target BLUEPRINT (structured analysis of the target prototype, may be null)
- Selected feature IDs/names the user wants to bring from source into target
- Source HTML code
- Target HTML code

Respond with ONLY valid JSON. No markdown fences, no explanation.

JSON structure:
{
  "summary": "1-2 sentences describing what will be merged and how",
  "plan": [
    {
      "action": "modify",
      "file": "index.html",
      "description": "Specific description of what will change in this file"
    }
  ],
  "questions": [
    {
      "id": "unique-kebab-id",
      "question": "The conflict question text",
      "options": ["Option A", "Option B", "Option C"]
    }
  ]
}

Rules for plan steps:
- For single-file HTML projects, the plan usually has 1-3 steps
- Be specific and actionable (e.g. "Integrate the hero section from source, preserving target's nav" not "merge files")
- Always include "index.html" as the file path for single-file projects
- Order steps logically

Rules for conflict questions:
- ONLY ask when there is a genuine ambiguity a human must resolve (font clash, CSS methodology difference, color scheme conflict)
- Maximum 3 questions total
- Always provide 2-4 options — multiple choice whenever possible
- DO NOT ask about things with obvious defaults (e.g. don't ask "should I keep the doctype?")
- If no genuine conflicts exist, return an empty questions array

Examples of genuine conflicts worth asking about:
- Source uses Inter font, target uses Poppins throughout
- Source uses Tailwind, target uses inline CSS
- Both have a Button component with different styles
- Color palette is fundamentally different`;

export async function runScoutAgent({
  sourceFiles,
  targetFiles,
  sourceBlueprint,
  targetBlueprint,
  selectedFeatureIds,
  apiKey,
}) {
  const agentId = `scout_${Date.now()}`;

  try {
    const sourceHtml = readFile(sourceFiles, 'index.html') ?? sourceFiles[0]?.content ?? '';
    const targetHtml = readFile(targetFiles, 'index.html') ?? targetFiles[0]?.content ?? '';

    // Resolve selected feature names from blueprint
    const sourceFeatures = sourceBlueprint?.features ?? [];
    const selectedFeatures = selectedFeatureIds.length > 0
      ? sourceFeatures.filter((f) => selectedFeatureIds.includes(f.id))
      : sourceFeatures;
    const featureNames = selectedFeatures.map((f) => f.name).join(', ') || 'all source features';

    writeMemory(agentId, 'selected_features', featureNames);

    const userMessage = `SOURCE BLUEPRINT:
${sourceBlueprint ? JSON.stringify(sourceBlueprint, null, 2) : 'Not available'}

TARGET BLUEPRINT:
${targetBlueprint ? JSON.stringify(targetBlueprint, null, 2) : 'Not available'}

SELECTED FEATURES TO MIGRATE FROM SOURCE TO TARGET: ${featureNames}

SOURCE HTML (${sourceFiles[0]?.path ?? 'index.html'}):
${sourceHtml.slice(0, 8000)}

TARGET HTML (${targetFiles[0]?.path ?? 'index.html'}):
${targetHtml.slice(0, 8000)}

Analyze the codebases and produce the merge plan JSON now.`;

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I will analyze both prototypes and output valid JSON only.' }] },
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const raw = await callGemini(apiKey, MODEL, contents, {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    });

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in scout response');
      result = JSON.parse(match[0]);
    }

    return {
      success: true,
      summary: result.summary ?? '',
      plan: (result.plan ?? []).map((s) => ({ ...s, status: 'pending' })),
      questions: result.questions ?? [],
    };
  } catch (err) {
    console.error('[ScoutAgent] error:', err.message);
    return { success: false, error: err.message };
  } finally {
    clearMemory(agentId);
  }
}
