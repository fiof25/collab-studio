import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ChatMessage, ConversationThread } from '@/types/chat';

interface ChatStore {
  threads: Record<string, ConversationThread>;
  ensureThread: (branchId: string) => void;
  addMessage: (branchId: string, message: ChatMessage) => void;
  appendStreamChunk: (branchId: string, messageId: string, chunk: string) => void;
  finalizeMessage: (branchId: string, messageId: string) => void;
  setThreadLoading: (branchId: string, loading: boolean) => void;
  clearThread: (branchId: string) => void;
  createUserMessage: (branchId: string, content: string) => ChatMessage;
  createAssistantMessage: (branchId: string) => ChatMessage;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: {},

  ensureThread: (branchId) => {
    if (!get().threads[branchId]) {
      set((s) => ({
        threads: {
          ...s.threads,
          [branchId]: { branchId, messages: [], isLoading: false },
        },
      }));
    }
  },

  addMessage: (branchId, message) => {
    get().ensureThread(branchId);
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: {
          ...s.threads[branchId]!,
          messages: [...(s.threads[branchId]?.messages ?? []), message],
        },
      },
    }));
  },

  appendStreamChunk: (branchId, messageId, chunk) => {
    set((s) => {
      const thread = s.threads[branchId];
      if (!thread) return s;
      return {
        threads: {
          ...s.threads,
          [branchId]: {
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === messageId
                ? { ...m, content: m.content + chunk, isTyping: true }
                : m
            ),
          },
        },
      };
    });
  },

  finalizeMessage: (branchId, messageId) => {
    set((s) => {
      const thread = s.threads[branchId];
      if (!thread) return s;
      return {
        threads: {
          ...s.threads,
          [branchId]: {
            ...thread,
            isLoading: false,
            messages: thread.messages.map((m) =>
              m.id === messageId
                ? { ...m, status: 'done' as const, isTyping: false }
                : m
            ),
          },
        },
      };
    });
  },

  setThreadLoading: (branchId, loading) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: s.threads[branchId]
          ? { ...s.threads[branchId]!, isLoading: loading }
          : { branchId, messages: [], isLoading: loading },
      },
    }));
  },

  clearThread: (branchId) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: { branchId, messages: [], isLoading: false },
      },
    }));
  },

  createUserMessage: (branchId, content) => ({
    id: `msg_${nanoid(8)}`,
    branchId,
    role: 'user',
    content,
    codeBlocks: [],
    status: 'done',
    timestamp: Date.now(),
  }),

  createAssistantMessage: (branchId) => ({
    id: `msg_${nanoid(8)}`,
    branchId,
    role: 'assistant',
    content: '',
    codeBlocks: [],
    status: 'streaming',
    timestamp: Date.now(),
    isTyping: true,
  }),
}));
