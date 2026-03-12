import { callModel, parseJSON } from './tools.js';
import { config } from '../config/models.js';

const SYSTEM = `You help clarify vague user requests before building a prototype. Given the user's message and context, generate structured multiple-choice questions to understand what they want.

Respond with ONLY a JSON object in this format:
{
  "text": "A short lead-in sentence (e.g. 'Let me understand what you're looking for!')",
  "questions": [
    {
      "id": "direction",
      "label": "What kind of project are you thinking?",
      "options": [
        {"key": "A", "label": "An interactive game"},
        {"key": "B", "label": "A dashboard or data tool"},
        {"key": "C", "label": "A marketing or portfolio site"},
        {"key": "X", "label": "Something else — describe your idea"}
      ]
    }
  ]
}

Rules:
- 1-2 questions max, 3-5 options each
- Last option should always be key "X" with a write-in prompt
- Keep labels concise and specific
- Tailor questions to the user's message context`;

export async function runQuestionAgent({ lastMessage, recentContext, hasCode, apiKey }) {
  try {
    const userContent = `User said: "${lastMessage}"\nContext: ${recentContext}\nHas existing code: ${hasCode}`;

    const raw = await callModel(apiKey, config.models.small, {
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }, { temperature: 0.5, maxOutputTokens: 400 });

    const parsed = parseJSON(raw);
    return {
      success: true,
      text: parsed.text || "Let me understand what you're looking for!",
      questions: parsed.questions || [],
    };
  } catch (err) {
    return { success: false, text: '', questions: [], error: err.message };
  }
}
