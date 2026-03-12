import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMergeStream } from '@/hooks/useMergeStream';
import type { MergeSSEEvent } from '@/hooks/useMergeStream';

// Helper to create a ReadableStream from SSE-formatted lines
function createSSEStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const data = lines.map((l) => `data: ${l}\n`).join('\n') + '\n';
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
}

function mockFetchWithStream(lines: string[], status = 200, headers: Record<string, string> = {}) {
  const stream = createSSEStream(lines);
  return vi.fn().mockResolvedValue({
    status,
    headers: new Headers(headers),
    body: stream,
  });
}

describe('useMergeStream', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const dummyScoutParams = {
    sourceFiles: [{ path: 'index.html', content: '<h1>Source</h1>', language: 'html' as const }],
    targetFiles: [{ path: 'index.html', content: '<h1>Target</h1>', language: 'html' as const }],
    sourceBlueprint: null,
    targetBlueprint: null,
    selectedFeatureIds: [],
  };

  const dummyExecuteParams = {
    sourceFiles: [{ path: 'index.html', content: '<h1>Source</h1>', language: 'html' as const }],
    targetFiles: [{ path: 'index.html', content: '<h1>Target</h1>', language: 'html' as const }],
    plan: [],
    answers: {},
    selectedFeatureIds: [],
    sourceBlueprint: null,
  };

  describe('startScout', () => {
    it('parses SSE plan events and calls onEvent', async () => {
      const planEvent = {
        type: 'plan',
        summary: 'Merge summary',
        plan: [{ action: 'modify', file: 'index.html', description: 'Merge hero', status: 'pending' }],
        questions: [],
      };
      globalThis.fetch = mockFetchWithStream([JSON.stringify(planEvent)]);

      const { startScout } = useMergeStream();
      const events: MergeSSEEvent[] = [];

      await startScout(dummyScoutParams, (e) => events.push(e));

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('plan');
      if (events[0]!.type === 'plan') {
        expect(events[0]!.summary).toBe('Merge summary');
        expect(events[0]!.plan).toHaveLength(1);
      }
    });

    it('parses multiple SSE events in sequence', async () => {
      const progressEvent = JSON.stringify({ type: 'progress', message: 'Analyzing...' });
      const planEvent = JSON.stringify({
        type: 'plan',
        summary: 'Done',
        plan: [],
        questions: [],
      });
      globalThis.fetch = mockFetchWithStream([progressEvent, planEvent]);

      const { startScout } = useMergeStream();
      const events: MergeSSEEvent[] = [];

      await startScout(dummyScoutParams, (e) => events.push(e));

      expect(events).toHaveLength(2);
      expect(events[0]!.type).toBe('progress');
      expect(events[1]!.type).toBe('plan');
    });
  });

  describe('executeMerge', () => {
    it('parses progress and done events correctly', async () => {
      const progressEvent = JSON.stringify({ type: 'progress', message: 'Merging files...' });
      const doneEvent = JSON.stringify({
        type: 'done',
        mergedFiles: [{ path: 'index.html', content: '<h1>Merged</h1>', language: 'html' }],
      });
      globalThis.fetch = mockFetchWithStream([progressEvent, doneEvent]);

      const { executeMerge } = useMergeStream();
      const events: MergeSSEEvent[] = [];

      await executeMerge(dummyExecuteParams, (e) => events.push(e));

      expect(events).toHaveLength(2);
      expect(events[0]!.type).toBe('progress');
      expect(events[1]!.type).toBe('done');
      if (events[1]!.type === 'done') {
        expect(events[1]!.mergedFiles).toHaveLength(1);
        expect(events[1]!.mergedFiles[0]!.path).toBe('index.html');
      }
    });
  });

  describe('error handling', () => {
    it('surfaces error events from SSE stream', async () => {
      const errorEvent = JSON.stringify({ type: 'error', error: 'Something went wrong' });
      globalThis.fetch = mockFetchWithStream([errorEvent]);

      const { startScout } = useMergeStream();
      const events: MergeSSEEvent[] = [];

      await startScout(dummyScoutParams, (e) => events.push(e));

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('error');
      if (events[0]!.type === 'error') {
        expect(events[0]!.error).toBe('Something went wrong');
      }
    });

    it('throws with retry message on 429 rate limit', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
        body: null,
      });

      const { startScout } = useMergeStream();

      await expect(
        startScout(dummyScoutParams, () => {})
      ).rejects.toThrow('Rate limit reached. Try again in 30s.');
    });

    it('throws with default retry time when Retry-After header is missing', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 429,
        headers: new Headers(),
        body: null,
      });

      const { startScout } = useMergeStream();

      await expect(
        startScout(dummyScoutParams, () => {})
      ).rejects.toThrow('Rate limit reached. Try again in 60s.');
    });
  });

  describe('timeout', () => {
    it('times out after 45 seconds', async () => {
      // Create a fetch that never resolves until aborted
      globalThis.fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const { startScout } = useMergeStream();
      let caughtError: Error | null = null;
      const promise = startScout(dummyScoutParams, () => {}).catch((err) => {
        caughtError = err as Error;
      });

      // Advance time past the 45s timeout
      await vi.advanceTimersByTimeAsync(46_000);

      await promise;

      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toContain('Agent timed out after 45 seconds');
    });
  });
});
