import { streamModel } from './tools.js';
import { config } from '../config/models.js';

const SYSTEM_CHAT = `You are a friendly, concise AI creative partner in a collaborative coding studio. The user is chatting with you — respond naturally in 2-4 sentences. Be warm and helpful. NEVER include code blocks or HTML in your responses.`;

const SYSTEM_BUILD = `You are a friendly AI creative partner. Summarize what's being built in 2-3 concise, enthusiastic sentences. Don't include code or technical details — just describe the experience. NEVER include code blocks or HTML.`;

export async function* runChatAgent({ messages, mode, summary, apiKey }) {
  const system = mode === 'build' ? SYSTEM_BUILD : SYSTEM_CHAT;

  let chatMessages;
  if (mode === 'build') {
    chatMessages = [{ role: 'user', content: `Summarize this for the user: ${summary}` }];
  } else {
    // Last 4 messages for chat context
    chatMessages = messages.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  try {
    yield* streamModel(apiKey, config.models.small, {
      system,
      messages: chatMessages,
    }, { temperature: 0.7, maxOutputTokens: 300 });
  } catch (err) {
    console.error('Chat agent error:', err.message);
    yield `Hmm, I had trouble generating a response. Let me try that again.`;
  }
}
