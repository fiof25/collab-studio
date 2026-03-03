import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ChatMessage } from '@/types/chat';

interface ChatStore {
  threads: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  addUserMessage: (branchId: string, content: string) => ChatMessage;
  startAssistantMessage: (branchId: string) => ChatMessage;
  appendChunk: (branchId: string, msgId: string, chunk: string) => void;
  finalizeMessage: (branchId: string, msgId: string, codeGenerated?: string) => void;
  setStreaming: (v: boolean) => void;
  clearThread: (branchId: string) => void;
  getThread: (branchId: string) => ChatMessage[];
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: {},
  isStreaming: false,

  addUserMessage: (branchId, content) => {
    const msg: ChatMessage = {
      id: `msg_${nanoid(8)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: [...(s.threads[branchId] ?? []), msg],
      },
    }));
    return msg;
  },

  startAssistantMessage: (branchId) => {
    const msg: ChatMessage = {
      id: `msg_${nanoid(8)}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: [...(s.threads[branchId] ?? []), msg],
      },
    }));
    return msg;
  },

  appendChunk: (branchId, msgId, chunk) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: (s.threads[branchId] ?? []).map((m) =>
          m.id === msgId ? { ...m, content: m.content + chunk } : m
        ),
      },
    }));
  },

  finalizeMessage: (branchId, msgId, codeGenerated) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [branchId]: (s.threads[branchId] ?? []).map((m) =>
          m.id === msgId ? { ...m, isStreaming: false, codeGenerated } : m
        ),
      },
    }));
  },

  setStreaming: (v) => set({ isStreaming: v }),

  clearThread: (branchId) => {
    set((s) => ({
      threads: { ...s.threads, [branchId]: [] },
    }));
  },

  getThread: (branchId) => get().threads[branchId] ?? [],
}));
