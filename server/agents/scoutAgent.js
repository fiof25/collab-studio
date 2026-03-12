import { callClaude, readFile, formatBlueprintBriefing, formatFeatureBriefing, detectStateConflicts } from './tools.js';
import { writeMemory, clearMemory } from './memory.js';
import { config } from '../config/models.js';

const SYSTEM_PROMPT = `You are a Scout Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a SOURCE and TARGET prototype, compare their architectures and features, and produce a merge plan that accounts for structural differences.

You receive:
- Source and Target architecture briefings (pattern, init flow, state, events)
- Selected features to migrate (with their behavior, entry points, and code anchors)
- State conflicts (overlapping variable names with different types/scopes)
- Integration points (source entry points that need wiring to target)
- Source and Target HTML code

Respond with ONLY valid JSON. No markdown fences, no explanation.

JSON structure:
{
  "summary": "1-2 sentences describing what will be merged and key architectural considerations",
  "plan": [
    {
      "action": "modify",
      "file": "index.html",
      "description": "Specific, actionable description of what will change"
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

Rules for the merge plan:
- If source and target have DIFFERENT architecture patterns (e.g. game loop vs form-driven), include a plan step for how to reconcile initialization
- If selected features have entry points with direction "out" that need wiring to the target, include a plan step for connecting them
- If state conflicts exist, include a plan step for resolving each conflict
- Check feature dependencies: if feature A depends on feature B and B is not selected, include a warning in the summary
- Be specific about WHERE in the target code each feature should be integrated (reference code anchors when available)
- Order steps logically: structural changes first, then feature integration, then wiring

Rules for conflict questions:
- ONLY ask when there is a genuine ambiguity a human must resolve
- Maximum 3 questions total
- Always provide 2-4 options
- Ask about architecture pattern conflicts (e.g. "Source uses requestAnimationFrame loop, target uses event-driven. Keep both patterns or convert source features to event-driven?")
- Ask about state conflicts
- Ask about styling conflicts (font, color, CSS methodology)
- DO NOT ask about things with obvious defaults`;

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

    // Resolve selected features from blueprint
    const sourceFeatures = sourceBlueprint?.features ?? [];
    const selectedFeatures = selectedFeatureIds.length > 0
      ? sourceFeatures.filter((f) => selectedFeatureIds.includes(f.id))
      : sourceFeatures;
    const featureNames = selectedFeatures.map((f) => f.name).join(', ') || 'all source features';

    writeMemory(agentId, 'selected_features', featureNames);

    // Build structured briefing instead of raw JSON dump
    const sourceBriefing = formatBlueprintBriefing(sourceBlueprint, 'SOURCE ARCHITECTURE');
    const targetBriefing = formatBlueprintBriefing(targetBlueprint, 'TARGET ARCHITECTURE');
    const featureBriefing = formatFeatureBriefing(selectedFeatures);
    const stateConflicts = detectStateConflicts(sourceBlueprint, targetBlueprint);

    // Detect integration points: source features with "out" entry points
    const integrationPoints = selectedFeatures
      .flatMap((f) => (f.entryPoints ?? [])
        .filter((ep) => ep.direction === 'out' || ep.direction === 'both')
        .map((ep) => `${f.name}: ${ep.name} [${ep.direction}] — ${ep.description}`)
      );

    // Check dependency warnings
    const selectedIds = new Set(selectedFeatureIds);
    const depWarnings = selectedFeatures
      .flatMap((f) => (f.dependencies ?? [])
        .filter((depId) => !selectedIds.has(depId))
        .map((depId) => `${f.name} depends on "${depId}" which is NOT selected`)
      );

    const userMessage = `${sourceBriefing}

${targetBriefing}

SELECTED FEATURES TO MIGRATE:
${featureBriefing}

${stateConflicts.length > 0 ? `STATE CONFLICTS:\n${stateConflicts.map((c) => `- "${c.name}": source=${c.source}, target=${c.target}`).join('\n')}` : 'STATE CONFLICTS: None'}

${integrationPoints.length > 0 ? `INTEGRATION POINTS (source outputs needing wiring):\n${integrationPoints.map((p) => `- ${p}`).join('\n')}` : 'INTEGRATION POINTS: None'}

${depWarnings.length > 0 ? `DEPENDENCY WARNINGS:\n${depWarnings.map((w) => `- ⚠ ${w}`).join('\n')}` : ''}

SOURCE HTML (${sourceFiles[0]?.path ?? 'index.html'}):
${sourceHtml.slice(0, 8000)}

TARGET HTML (${targetFiles[0]?.path ?? 'index.html'}):
${targetHtml.slice(0, 8000)}

Analyze the codebases and produce the merge plan JSON now.`;

    const raw = await callClaude(apiKey, config.models.small, {
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }, { temperature: 0.2, maxOutputTokens: 2048 });

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
