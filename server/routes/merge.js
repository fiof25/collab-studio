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
