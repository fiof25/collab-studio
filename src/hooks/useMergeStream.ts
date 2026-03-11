import type { ProjectFile } from '@/types/branch';
import type { Blueprint, MergePlanStep } from '@/types/blueprint';

export interface ConflictQuestion {
  id: string;
  question: string;
  options: string[];
}

export type MergeSSEEvent =
  | { type: 'progress'; message: string }
  | { type: 'plan'; summary: string; plan: MergePlanStep[]; questions: ConflictQuestion[] }
  | { type: 'done'; mergedFiles: ProjectFile[] }
  | { type: 'error'; error: string };

interface ScoutParams {
  sourceFiles: ProjectFile[];
  targetFiles: ProjectFile[];
  sourceBlueprint: Blueprint | null;
  targetBlueprint: Blueprint | null;
  selectedFeatureIds: string[];
}

interface ExecuteParams {
  sourceFiles: ProjectFile[];
  targetFiles: ProjectFile[];
  plan: MergePlanStep[];
  answers: Record<string, string>;
  selectedFeatureIds: string[];
  sourceBlueprint: Blueprint | null;
  instructions?: string;
}

export function useMergeStream() {
  const startScout = (
    params: ScoutParams,
    onEvent: (e: MergeSSEEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => streamPost('/api/merge/start', params, onEvent, signal);

  const executeMerge = (
    params: ExecuteParams,
    onEvent: (e: MergeSSEEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => streamPost('/api/merge/execute', params, onEvent, signal);

  return { startScout, executeMerge };
}

const TIMEOUT_MS = 45_000;

/** Merge two AbortSignals — aborts the combined signal if either input fires */
function mergeSignals(...signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) { ctrl.abort(s.reason); break; }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

async function streamPost(
  url: string,
  body: unknown,
  onEvent: (e: MergeSSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), TIMEOUT_MS);

  const effectiveSignal = signal
    ? mergeSignals(signal, timeoutCtrl.signal)
    : timeoutCtrl.signal;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: effectiveSignal,
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') ?? '60';
      throw new Error(`Rate limit reached. Try again in ${retryAfter}s.`);
    }

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)) as MergeSSEEvent);
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    if (timeoutCtrl.signal.aborted && !(signal?.aborted)) {
      throw new Error('Agent timed out after 45 seconds. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
