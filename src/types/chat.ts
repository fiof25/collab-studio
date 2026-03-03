export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  codeGenerated?: string;
  isStreaming?: boolean;
}
