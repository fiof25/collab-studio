import { useCallback, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { mockResponses } from '@/data/mockMessages';
import type { CodeBlock } from '@/types/chat';

const FALLBACK_RESPONSES = [
  "I've updated the prototype with those changes. The new version preserves the layout while improving the visual hierarchy.",
  "Done! I've added the requested feature. You can see it in the preview panel on the right.",
  "Great idea. I've implemented that and kept everything consistent with the existing design language.",
  "I've made those updates. The changes are minimal and focused — no unnecessary modifications to other parts.",
];

function pickResponse(input: string): { text: string; code?: CodeBlock } {
  const lower = input.toLowerCase();
  for (const r of mockResponses) {
    if (r.triggers.some((t) => lower.includes(t))) {
      return {
        text: r.text,
        code: r.code
          ? { language: r.code.language, filename: r.code.filename, code: r.code.code }
          : undefined,
      };
    }
  }
  const idx = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return { text: FALLBACK_RESPONSES[idx] ?? FALLBACK_RESPONSES[0]! };
}

export function useChatStream(branchId: string) {
  const { addMessage, appendStreamChunk, finalizeMessage, setThreadLoading, createUserMessage, createAssistantMessage } =
    useChatStore();
  const streamingRef = useRef(false);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || streamingRef.current) return;
      streamingRef.current = true;

      // Add user message
      const userMsg = createUserMessage(branchId, content.trim());
      addMessage(branchId, userMsg);

      // Create assistant message placeholder
      const assistantMsg = createAssistantMessage(branchId);
      addMessage(branchId, assistantMsg);
      setThreadLoading(branchId, true);

      // Pick a response
      const { text, code } = pickResponse(content);

      // Build full response text (text + code block if any)
      let fullText = text;
      let streamText = text;

      // Stream the main text first
      let charIdx = 0;
      const interval = setInterval(() => {
        if (charIdx < streamText.length) {
          appendStreamChunk(branchId, assistantMsg.id, streamText[charIdx]!);
          charIdx++;
        } else {
          clearInterval(interval);

          // If there's a code block, add it after text streaming
          if (code) {
            // Add code block to the message via a direct finalizeMessage + update
            useChatStore.setState((s) => {
              const thread = s.threads[branchId];
              if (!thread) return s;
              return {
                threads: {
                  ...s.threads,
                  [branchId]: {
                    ...thread,
                    isLoading: false,
                    messages: thread.messages.map((m) =>
                      m.id === assistantMsg.id
                        ? {
                            ...m,
                            content: fullText,
                            codeBlocks: [code],
                            status: 'done' as const,
                            isTyping: false,
                          }
                        : m
                    ),
                  },
                },
              };
            });
          } else {
            finalizeMessage(branchId, assistantMsg.id);
          }

          streamingRef.current = false;
        }
      }, 18);
    },
    [branchId, addMessage, appendStreamChunk, finalizeMessage, setThreadLoading, createUserMessage, createAssistantMessage]
  );

  return { sendMessage };
}
