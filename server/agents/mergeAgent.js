import { callGemini, readFile } from './tools.js';
import { clearMemory } from './memory.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a Merge Agent for a collaborative prototyping tool called Collab Studio.

Your job: intelligently merge a SOURCE HTML prototype into a TARGET HTML prototype, bringing in only the selected features.

You receive:
- The feature names to migrate from source into target
- A step-by-step merge plan
- Answers to any conflict questions (font choice, CSS method, etc.)
- The full source HTML
- The full target HTML

Output rules:
- Output ONLY the complete merged HTML document. No markdown fences, no explanation.
- Bring in the selected features from source, adapted to match the target's conventions
- Preserve all existing features from the target
- If source uses Tailwind but target uses inline CSS: convert to inline CSS
- If source uses CSS variables but target uses hardcoded values: adapt accordingly
- Apply conflict resolutions exactly as specified in the answers
- The output must be a complete, valid, self-contained HTML document with no broken references`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runMergeAgent({
  sourceFiles,
  targetFiles,
  plan,
  answers,
  selectedFeatureIds,
  sourceBlueprint,
  emit,
  apiKey,
}) {
  const agentId = `merge_${Date.now()}`;

  try {
    const sourceHtml = readFile(sourceFiles, 'index.html') ?? sourceFiles[0]?.content ?? '';
    const targetHtml = readFile(targetFiles, 'index.html') ?? targetFiles[0]?.content ?? '';

    const sourceFeatures = sourceBlueprint?.features ?? [];
    const selectedFeatures = selectedFeatureIds.length > 0
      ? sourceFeatures.filter((f) => selectedFeatureIds.includes(f.id))
      : sourceFeatures;
    const featureNames = selectedFeatures.map((f) => f.name).join(', ') || 'all features';

    emit({ type: 'progress', message: `Reading source: ${sourceFiles[0]?.path ?? 'index.html'}` });
    await sleep(150);
    emit({ type: 'progress', message: `Reading target: ${targetFiles[0]?.path ?? 'index.html'}` });
    await sleep(150);

    // Emit each plan step as a progress message
    for (const step of plan ?? []) {
      emit({ type: 'progress', message: step.description });
      await sleep(120);
    }

    emit({ type: 'progress', message: 'Running AI merge…' });

    const answersText =
      answers && Object.keys(answers).length > 0
        ? `\nConflict resolutions:\n${Object.entries(answers)
            .map(([id, ans]) => `- ${id}: ${ans}`)
            .join('\n')}`
        : '';

    const planText = (plan ?? []).map((s, i) => `${i + 1}. ${s.description}`).join('\n');

    const userMessage = `SELECTED FEATURES TO BRING FROM SOURCE: ${featureNames}

MERGE PLAN:
${planText || '1. Intelligently merge selected features from source into target'}
${answersText}

SOURCE HTML:
${sourceHtml.slice(0, 12000)}

TARGET HTML:
${targetHtml.slice(0, 12000)}

Output the complete merged HTML document now. No markdown fences — raw HTML only.`;

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Ready. I will output only the merged HTML document.' }] },
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const raw = await callGemini(apiKey, MODEL, contents, {
      temperature: 0.2,
      maxOutputTokens: 8192,
    });

    // Strip markdown fences if Gemini wrapped the output
    let mergedHtml = raw.trim();
    const fenceMatch = mergedHtml.match(/^```(?:html)?\n([\s\S]*?)\n```$/);
    if (fenceMatch) mergedHtml = fenceMatch[1];

    emit({ type: 'progress', message: 'Merge complete' });

    return {
      success: true,
      mergedFiles: [{ path: 'index.html', content: mergedHtml, language: 'html' }],
    };
  } catch (err) {
    console.error('[MergeAgent] error:', err.message);
    emit({ type: 'error', message: err.message });
    return { success: false, error: err.message };
  } finally {
    clearMemory(agentId);
  }
}
