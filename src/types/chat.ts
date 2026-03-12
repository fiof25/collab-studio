export interface QuestionOption {
  key: string;      // "A", "B", "C", "X"
  label: string;    // "An interactive game"
}

export interface Question {
  id: string;       // "direction"
  label: string;    // "What kind of project?"
  options: QuestionOption[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  codeGenerated?: string;
  isStreaming?: boolean;
  questions?: Question[];
  selectedAnswer?: string;
  route?: 'build' | 'question' | 'chat';
}
