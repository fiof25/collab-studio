import { useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/store/useChatStore';
import { useProjectStore } from '@/store/useProjectStore';
import type { ProjectFile } from '@/types/branch';
import { captureHtmlScreenshot } from '@/utils/captureScreenshot';

const SERVER_URL = '';

/** Fire-and-forget: generate blueprint + snapshot after a code checkpoint.
 *  Runs sequentially to avoid bursting past the rate limit (10/min on /api/blueprint). */
async function triggerAgents(
  branchId: string,
  branchName: string,
  parentBranchName: string | undefined,
  files: ProjectFile[],
  updateBlueprint: (id: string, bp: import('@/types/blueprint').Blueprint) => void,
  updateBranch: (id: string, patch: Parameters<ReturnType<typeof useProjectStore.getState>['updateBranch']>[1]) => void,
  screenshotBase64?: string | null,
  userPrompt?: string,
  aiSummary?: string,
  existingBlueprint?: import('@/types/blueprint').Blueprint | null,
) {
  try {
    const bpRes = await fetch(`${SERVER_URL}/api/blueprint/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId,
        branchName,
        parentBranchName,
        files,
        conversationContext: userPrompt ? { lastUserMessage: userPrompt, lastAIResponse: aiSummary } : undefined,
        existingBlueprint: existingBlueprint ?? undefined,
      }),
    });
    if (bpRes.ok) {
      const bpData = await bpRes.json();
      if (bpData?.success) {
        updateBlueprint(branchId, bpData.blueprint);
        if (bpData.blueprint.title) {
          updateBranch(branchId, { name: bpData.blueprint.title });
        }
      }
    }

    const snapRes = await fetch(`${SERVER_URL}/api/blueprint/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, branchName, files, screenshotBase64, userPrompt, aiSummary }),
    });
    if (snapRes.ok) {
      const snapData = await snapRes.json();
      if (snapData?.success && snapData.description) {
        updateBranch(branchId, { description: snapData.description });
      }
    }
  } catch {
    // Server not running or rate limited — silently skip
  }
}

export function useChatStream(branchId: string) {
  const abortRef = useRef<AbortController | null>(null);
  const { addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread, setQuestions, setRoute } =
    useChatStore();
  const { getBranchById, updateBranch, updateBlueprint } = useProjectStore();

  const sendMessage = useCallback(
    async (prompt: string, tier: 'large' | 'small' = 'large') => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      abortRef.current = new AbortController();
      setStreaming(true);

      addUserMessage(branchId, trimmed);
      const assistantMsg = startAssistantMessage(branchId);

      const branch = getBranchById(branchId);
      const latestCkpt = branch?.checkpoints[branch.checkpoints.length - 1];
      const currentCode =
        latestCkpt?.files?.find((f) => f.path === 'index.html')?.content ??
        latestCkpt?.codeSnapshot ??
        '';

      // Build message history for server
      const thread = getThread(branchId);
      const history = thread
        .filter((m) => m.id !== assistantMsg.id && !m.isStreaming)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      let fullContent = '';
      let codeGenerated: string | undefined;

      try {
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, currentCode, tier, blueprint: branch?.blueprint }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => `HTTP ${res.status}`);
          throw new Error(raw);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'route') {
                setRoute(branchId, assistantMsg.id, parsed.route);
              } else if (parsed.type === 'text') {
                fullContent += parsed.text;
                appendChunk(branchId, assistantMsg.id, parsed.text);
              } else if (parsed.type === 'code') {
                codeGenerated = parsed.html;
              } else if (parsed.type === 'questions') {
                setQuestions(branchId, assistantMsg.id, parsed.data);
              } else if (!parsed.type && parsed.text) {
                // Legacy fallback
                fullContent += parsed.text;
                appendChunk(branchId, assistantMsg.id, parsed.text);
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const errMsg = `\n\n⚠️ ${(err as Error).message}`;
          fullContent += errMsg;
          appendChunk(branchId, assistantMsg.id, errMsg);
        }
      }

      // Save generated code as a new checkpoint
      if (codeGenerated) {
        const freshBranch = getBranchById(branchId);
        if (freshBranch) {
          updateBranch(branchId, {
            checkpoints: [
              ...freshBranch.checkpoints,
              {
                id: `ckpt_${nanoid(6)}`,
                branchId,
                label: `AI: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}`,
                timestamp: Date.now(),
                thumbnailUrl: '',
                codeSnapshot: codeGenerated,
                files: [{ path: 'index.html', content: codeGenerated, language: 'html' }],
              },
            ],
          });
        }
      }

      // Fire blueprint + snapshot agents after code checkpoint
      if (codeGenerated) {
        const latestBranch = getBranchById(branchId);
        if (latestBranch) {
          const newFiles: ProjectFile[] = [{ path: 'index.html', content: codeGenerated, language: 'html' }];
          const parentBranch = latestBranch.parentId
            ? getBranchById(latestBranch.parentId)
            : undefined;
          const aiSummary = fullContent.slice(0, 300) || undefined;
          const screenshotBase64 = await captureHtmlScreenshot(codeGenerated).catch(() => null);
          triggerAgents(branchId, latestBranch.name, parentBranch?.name, newFiles, updateBlueprint, updateBranch, screenshotBase64, trimmed, aiSummary, latestBranch.blueprint).catch(() => {});
        }
      }

      finalizeMessage(branchId, assistantMsg.id, codeGenerated);
      setStreaming(false);
      abortRef.current = null;
    },
    [branchId, addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread, getBranchById, updateBranch, updateBlueprint, setQuestions, setRoute]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, abort };
}
