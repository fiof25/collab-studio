import { useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/store/useChatStore';
import { useProjectStore } from '@/store/useProjectStore';

function extractHtmlBlock(text: string): string | null {
  const match = text.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export function useChatStream(branchId: string) {
  const abortRef = useRef<AbortController | null>(null);
  const { addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread } =
    useChatStore();
  const { getBranchById, updateBranch } = useProjectStore();

  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      abortRef.current = new AbortController();
      setStreaming(true);

      addUserMessage(branchId, trimmed);
      const assistantMsg = startAssistantMessage(branchId);

      // Build messages array for the server (exclude the blank assistant message just added)
      const thread = getThread(branchId);
      const messagesForServer = thread
        .filter((m) => m.id !== assistantMsg.id && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const branch = getBranchById(branchId);
      const currentCode = branch?.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '';

      let fullContent = '';

      try {
        const res = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesForServer, currentCode }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server error: ${res.status}`);
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
              const parsed = JSON.parse(data) as { text?: string };
              if (parsed.text) {
                fullContent += parsed.text;
                appendChunk(branchId, assistantMsg.id, parsed.text);
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          fullContent += '\n\n[Stopped]';
        } else {
          const errMsg = `\n\n[Error: ${(err as Error).message}. Is the server running on port 3001?]`;
          fullContent += errMsg;
          appendChunk(branchId, assistantMsg.id, errMsg);
        }
      }

      // Extract and apply code if present
      const codeGenerated = extractHtmlBlock(fullContent) ?? undefined;
      if (codeGenerated && branch) {
        updateBranch(branchId, {
          checkpoints: [
            ...branch.checkpoints,
            {
              id: `ckpt_${nanoid(6)}`,
              branchId,
              label: `AI: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}`,
              timestamp: Date.now(),
              thumbnailUrl: '',
              codeSnapshot: codeGenerated,
            },
          ],
        });
      }

      finalizeMessage(branchId, assistantMsg.id, codeGenerated);
      setStreaming(false);
      abortRef.current = null;
    },
    [branchId, addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread, getBranchById, updateBranch]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, abort };
}
