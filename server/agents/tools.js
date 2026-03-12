import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/models.js';
import { callGemini, streamGemini } from '../providers/gemini.js';

/** Read a specific file's content by path */
export function readFile(files, path) {
  return files.find((f) => f.path === path)?.content ?? null;
}

/** List all file paths in the branch */
export function listFiles(files) {
  return files.map((f) => f.path);
}

/** Search for a regex pattern across all files; returns matches per file */
export function searchCode(files, pattern) {
  const regex = new RegExp(pattern, 'gi');
  return files.flatMap((f) => {
    const matches = f.content.match(regex) ?? [];
    return matches.length > 0 ? [{ path: f.path, matches }] : [];
  });
}

/**
 * Helper: call the active AI provider (non-streaming) for background agents.
 * Branches by config.provider to use Claude or Gemini.
 */
export async function callModel(apiKey, model, payload, params = {}) {
  console.log(`[callModel] provider=${config.provider} model=${model} msgs=${payload.messages?.length}`);
  if (config.provider === 'gemini') {
    const result = await callGemini(apiKey, model, payload, params);
    if (params.richResponse) {
      console.log(`[callModel] Gemini returned ${result.text?.length ?? 0} chars, truncated=${result.truncated}`);
      return result;
    }
    console.log(`[callModel] Gemini returned ${result?.length ?? 0} chars`);
    return result;
  }
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: params.maxOutputTokens ?? 16384,
    temperature: params.temperature ?? 0.7,
    ...(payload.system ? { system: payload.system } : {}),
    messages: payload.messages,
  });
  const text = msg.content[0]?.text ?? '';
  const truncated = msg.stop_reason === 'max_tokens';
  if (truncated) console.warn(`[callModel] Claude response truncated (max_tokens) — ${text.length} chars`);
  console.log(`[callModel] Claude returned ${text.length} chars`);
  if (params.richResponse) return { text, truncated };
  return text;
}

/**
 * Streaming call to the active AI provider. Yields text chunks.
 */
export async function* streamModel(apiKey, model, payload, params = {}) {
  console.log(`[streamModel] provider=${config.provider} model=${model} msgs=${payload.messages?.length}`);
  if (config.provider === 'gemini') {
    yield* streamGemini(apiKey, model, payload, params);
    return;
  }
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.stream({
    model,
    max_tokens: params.maxOutputTokens ?? 16384,
    temperature: params.temperature ?? 0.7,
    ...(payload.system ? { system: payload.system } : {}),
    messages: payload.messages,
  });
  let chunkCount = 0;
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      chunkCount++;
      yield event.delta.text;
    }
  }
  console.log(`[streamModel] Claude stream done — ${chunkCount} text chunks`);
}

/**
 * Parse JSON that may be wrapped in markdown code fences (common with Gemini).
 * Strips ```json ... ``` or ``` ... ``` before parsing.
 */
export function parseJSON(raw) {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * Format a blueprint into a structured briefing for merge agents.
 * Returns a concise text summary instead of raw JSON dump.
 */
export function formatBlueprintBriefing(blueprint, label = 'BLUEPRINT') {
  if (!blueprint) return `${label}: Not available`;

  const lines = [`${label}:`];
  lines.push(`- Title: ${blueprint.title}`);
  lines.push(`- Summary: ${blueprint.summary}`);

  if (blueprint.architecture) {
    lines.push(`- Pattern: ${blueprint.architecture.pattern}`);
    lines.push(`- Init: ${blueprint.architecture.initFlow}`);
    if (blueprint.architecture.stateModel?.length) {
      const stateStr = blueprint.architecture.stateModel
        .map((s) => `${s.name} (${s.type}, ${s.scope})`)
        .join(', ');
      lines.push(`- State: ${stateStr}`);
    }
    if (blueprint.architecture.eventModel?.length) {
      lines.push(`- Events: ${blueprint.architecture.eventModel.join('; ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format selected features with their entry points and code regions for merge agents.
 */
export function formatFeatureBriefing(features) {
  if (!features?.length) return 'No features selected';

  return features.map((f) => {
    const lines = [`- ${f.name}: ${f.behavior || f.description}`];
    if (f.state?.length) lines.push(`  State: ${f.state.join(', ')}`);
    if (f.entryPoints?.length) {
      const eps = f.entryPoints.map((ep) => `${ep.name} [${ep.direction}]`).join(', ');
      lines.push(`  Entry points: ${eps}`);
    }
    if (f.codeRegions?.length) {
      const crs = f.codeRegions.map((cr) => `${cr.anchor} in ${cr.file}`).join(', ');
      lines.push(`  Code anchors: ${crs}`);
    }
    return lines.join('\n');
  }).join('\n');
}

/**
 * Detect state conflicts between two blueprints.
 */
export function detectStateConflicts(sourceBlueprint, targetBlueprint) {
  if (!sourceBlueprint?.architecture?.stateModel || !targetBlueprint?.architecture?.stateModel) return [];

  const targetNames = new Map(targetBlueprint.architecture.stateModel.map((s) => [s.name, s]));
  const conflicts = [];

  for (const src of sourceBlueprint.architecture.stateModel) {
    const tgt = targetNames.get(src.name);
    if (tgt && (src.type !== tgt.type || src.scope !== tgt.scope)) {
      conflicts.push({
        name: src.name,
        source: `${src.type}, ${src.scope}`,
        target: `${tgt.type}, ${tgt.scope}`,
      });
    }
  }

  return conflicts;
}

/** Backward-compatible alias */
export const callClaude = callModel;
