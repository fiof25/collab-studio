export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface ChatMessage {
  id: string;
  branchId: string;
  role: MessageRole;
  content: string;
  codeBlocks: CodeBlock[];
  status: MessageStatus;
  timestamp: number;
  isTyping?: boolean;
}

export interface ConversationThread {
  branchId: string;
  messages: ChatMessage[];
  isLoading: boolean;
}
