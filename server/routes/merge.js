import express from 'express';
import { runScoutAgent } from '../agents/scoutAgent.js';
import { runMergeAgent } from '../agents/mergeAgent.js';

export const mergeRouter = express.Router();

/** Set SSE headers and flush */
function sseSetup(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

/** Write one SSE event */
function sseWrite(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** Mock plan returned when no API key is configured */
function mockPlan(featureCount) {
  return {
    summary: `Will merge ${featureCount > 0 ? featureCount + ' selected feature(s)' : 'selected features'} from source prototype into target.`,
    plan: [
      {
        action: 'modify',
        file: 'index.html',
        description: 'Integrate selected features from source into target prototype',
        status: 'pending',
      },
    ],
    questions: [],
  };
}

// POST /api/merge/prompts
// Body: { baseName, contributorName, baseBlueprint, contributorBlueprint, baseHtml, contributorHtml }
// Returns: { prompts: string[] }
mergeRouter.post('/prompts', async (req, res) => {
  const { baseName, contributorName, baseBlueprint, contributorBlueprint, baseHtml, contributorHtml } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    return res.json({ prompts: [
      `Keep ${baseName}'s layout, adopt ${contributorName}'s styling.`,
      `Use ${contributorName}'s color scheme on ${baseName}'s structure.`,
      `Merge navigation from ${baseName} with content from ${contributorName}.`,
      `Use ${baseName} as the base, bring in ${contributorName}'s visual updates.`,
    ]});
  }

  const baseFeatures = (baseBlueprint?.features ?? []).map(f => `${f.name}${f.description ? ` (${f.description})` : ''}`).join('\n- ') || 'none';
  const contribFeatures = (contributorBlueprint?.features ?? []).map(f => `${f.name}${f.description ? ` (${f.description})` : ''}`).join('\n- ') || 'none';

  const userMessage = `You are helping a designer write merge instructions to combine two UI prototypes.

BASE ("${baseName}"):
- ${baseFeatures}
${baseHtml ? `HTML:\n${baseHtml.slice(0, 2000)}` : ''}

CONTRIBUTOR ("${contributorName}"):
- ${contribFeatures}
${contributorHtml ? `HTML:\n${contributorHtml.slice(0, 2000)}` : ''}

Generate exactly 4 short, specific merge suggestions. Rules:
- Max 8 words each
- Start with an action verb (Keep, Use, Apply, Replace, Add, Swap)
- Reference ONE concrete visual element per suggestion (e.g. a specific color, component, or section visible in the HTML)
- Cover different aspects: layout, color/style, typography, components
- No vague phrases ("best of both", "combine the two")

Good examples:
- "Keep ${baseName}'s nav, use ${contributorName}'s hero"
- "Apply ${contributorName}'s dark background to ${baseName}"
- "Use ${contributorName}'s card grid, keep ${baseName}'s typography"

Respond with ONLY a JSON array of 4 strings. No markdown, no explanation.`;

  try {
    const { callClaude } = await import('../agents/tools.js');
    const raw = await callClaude(apiKey, 'claude-haiku-4-5-20251001', {
      messages: [{ role: 'user', content: userMessage }],
    }, { temperature: 0.7, maxOutputTokens: 512 });

    let prompts;
    try {
      prompts = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      prompts = match ? JSON.parse(match[0]) : [];
    }

    res.json({ prompts: Array.isArray(prompts) ? prompts.slice(0, 4) : [] });
  } catch (err) {
    res.status(500).json({ prompts: [], error: err.message });
  }
});

// POST /api/merge/start
// Body: { sourceFiles, targetFiles, sourceBlueprint, targetBlueprint, selectedFeatureIds }
// SSE stream → { type: 'progress', message } → { type: 'plan', summary, plan, questions }
mergeRouter.post('/start', async (req, res) => {
  const { sourceFiles, targetFiles, sourceBlueprint, targetBlueprint, selectedFeatureIds } = req.body;

  if (!Array.isArray(sourceFiles) || !Array.isArray(targetFiles)) {
    return res.status(400).json({ success: false, error: 'Missing sourceFiles or targetFiles' });
  }

  sseSetup(res);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    sseWrite(res, { type: 'plan', ...mockPlan((selectedFeatureIds ?? []).length) });
    res.end();
    return;
  }

  sseWrite(res, { type: 'progress', message: 'Scout analyzing prototypes…' });

  const result = await runScoutAgent({
    sourceFiles,
    targetFiles,
    sourceBlueprint: sourceBlueprint ?? null,
    targetBlueprint: targetBlueprint ?? null,
    selectedFeatureIds: selectedFeatureIds ?? [],
    apiKey,
  });

  if (!result.success) {
    sseWrite(res, { type: 'error', error: result.error });
  } else {
    sseWrite(res, {
      type: 'plan',
      summary: result.summary,
      plan: result.plan,
      questions: result.questions,
    });
  }

  res.end();
});

// POST /api/merge/execute
// Body: { sourceFiles, targetFiles, plan, answers, selectedFeatureIds, sourceBlueprint }
// SSE stream → { type: 'progress', message } ... { type: 'done', mergedFiles } | { type: 'error', error }
mergeRouter.post('/execute', async (req, res) => {
  const { sourceFiles, targetFiles, plan, answers, selectedFeatureIds, sourceBlueprint } = req.body;

  if (!Array.isArray(sourceFiles) || !Array.isArray(targetFiles)) {
    return res.status(400).json({ success: false, error: 'Missing sourceFiles or targetFiles' });
  }

  sseSetup(res);

  const emit = (data) => sseWrite(res, data);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    // Mock mode: return target code unchanged
    emit({ type: 'progress', message: 'Merging prototypes (mock mode)…' });
    await new Promise((r) => setTimeout(r, 600));
    const targetCode =
      targetFiles.find((f) => f.path === 'index.html')?.content ?? targetFiles[0]?.content ?? '';
    emit({ type: 'done', mergedFiles: [{ path: 'index.html', content: targetCode, language: 'html' }] });
    res.end();
    return;
  }

  const result = await runMergeAgent({
    sourceFiles,
    targetFiles,
    plan: plan ?? [],
    answers: answers ?? {},
    selectedFeatureIds: selectedFeatureIds ?? [],
    sourceBlueprint: sourceBlueprint ?? null,
    emit,
    apiKey,
  });

  if (result.success) {
    sseWrite(res, { type: 'done', mergedFiles: result.mergedFiles });
  } else {
    sseWrite(res, { type: 'error', error: result.error });
  }

  res.end();
});
