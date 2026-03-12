import { streamModel } from './tools.js';
import { config } from '../config/models.js';

const SYSTEM_CHAT = `You are a friendly, concise AI creative partner in a collaborative coding studio. The user is chatting with you — respond naturally in 2-4 sentences. Be warm and helpful. NEVER include code blocks or HTML in your responses.`;

const SYSTEM_BUILD = `You are a friendly AI creative partner. Summarize what's being built in 2-3 concise, enthusiastic sentences. Don't include code or technical details — just describe the experience. NEVER include code blocks or HTML.`;

const SYSTEM_RECAP = `You are a friendly AI creative partner describing what was just built. Given the generated code, write a short recap (2-4 sentences) of what the app looks like and what it can do. Use simple, non-technical language — describe the experience as a user would see it, not the code. Be specific about visible features (buttons, sections, animations, colors). NEVER include code blocks, HTML tags, or technical jargon like "div", "flexbox", "component", etc.`;

export async function* runChatAgent({ messages, mode, summary, html, apiKey }) {
  const systems = { build: SYSTEM_BUILD, chat: SYSTEM_CHAT, recap: SYSTEM_RECAP };
  const system = systems[mode] || SYSTEM_CHAT;

  let chatMessages;
  if (mode === 'build') {
    chatMessages = [{ role: 'user', content: `Summarize this for the user: ${summary}` }];
  } else if (mode === 'recap') {
    // Give it a truncated view of the HTML so it can describe the actual result
    const snippet = (html || '').slice(0, 6000);
    chatMessages = [{ role: 'user', content: `Here is the code that was just generated. Describe what the user will see:\n\n${snippet}` }];
  } else {
    // Last 4 messages for chat context
    chatMessages = messages.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  try {
    console.log(`[chat] Streaming ${config.models.small}, mode=${mode}, msgs=${chatMessages.length}`);
    let chunks = 0;
    for await (const chunk of streamModel(apiKey, config.models.small, {
      system,
      messages: chatMessages,
    }, { temperature: 0.7, maxOutputTokens: 300 })) {
      chunks++;
      yield chunk;
    }
    console.log(`[chat] Done — ${chunks} chunks yielded`);
  } catch (err) {
    console.error('[chat] CRASHED:', err);
    yield `Hmm, I had trouble generating a response. Let me try that again.`;
  }
}
