import { callModel, parseJSON } from './tools.js';
import { config } from '../config/models.js';

const SYSTEM = `You are a routing classifier. Given a user message and recent conversation context, classify the user's intent as exactly one of:
- "build" — the user wants to create, modify, or iterate on code/UI
- "question" — the user's request is vague or ambiguous and needs clarification before building
- "chat" — the user is asking a general question, chatting, or not requesting code changes

Respond with ONLY a JSON object: {"route":"build"} or {"route":"question"} or {"route":"chat"}`;

export async function runRouterAgent({ lastMessage, recentContext, hasCode, afterQuestion, apiKey }) {
  // After a question round, always go to build
  if (afterQuestion) {
    return { success: true, route: 'build' };
  }

  try {
    const userContent = `Recent context:\n${recentContext}\n\nLatest message: "${lastMessage}"\nHas existing code: ${hasCode}`;

    const raw = await callModel(apiKey, config.models.small, {
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }, { temperature: 0, maxOutputTokens: 30 });

    const parsed = parseJSON(raw);
    const route = ['build', 'question', 'chat'].includes(parsed.route) ? parsed.route : 'build';
    return { success: true, route };
  } catch {
    return { success: true, route: 'build' };
  }
}
