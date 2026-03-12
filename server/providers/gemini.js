import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Convert Anthropic-style message content to Gemini parts format.
 * Handles plain strings, and arrays with text/image blocks.
 */
function normalizeContent(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content) }];

  return content.map((block) => {
    if (block.type === 'text') return { text: block.text };
    if (block.type === 'image' && block.source?.type === 'base64') {
      return {
        inlineData: {
          mimeType: block.source.media_type,
          data: block.source.data,
        },
      };
    }
    return { text: JSON.stringify(block) };
  });
}

/**
 * Convert Anthropic-style messages to Gemini history + last user turn.
 */
function buildGeminiMessages(messages) {
  const history = [];
  for (const msg of messages.slice(0, -1)) {
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: normalizeContent(msg.content),
    });
  }
  const last = messages[messages.length - 1];
  return { history, lastParts: normalizeContent(last.content) };
}

/**
 * Non-streaming call to Gemini. Same signature as callClaude.
 */
export async function callGemini(apiKey, model, { system, messages }, params = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model,
    ...(system ? { systemInstruction: system } : {}),
  });

  const { history, lastParts } = buildGeminiMessages(messages);

  const chat = genModel.startChat({
    history,
    generationConfig: {
      maxOutputTokens: params.maxOutputTokens ?? 16384,
      temperature: params.temperature ?? 0.7,
    },
  });

  const result = await chat.sendMessage(lastParts);
  const text = result.response.text();
  const finishReason = result.response.candidates?.[0]?.finishReason;
  const truncated = finishReason === 'MAX_TOKENS';
  if (truncated) console.warn(`[gemini] Response truncated (MAX_TOKENS) — ${text.length} chars`);
  return params.richResponse ? { text, truncated } : text;
}

/**
 * Streaming call to Gemini. Yields text chunks as an async generator.
 */
export async function* streamGemini(apiKey, model, { system, messages }, params = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model,
    ...(system ? { systemInstruction: system } : {}),
  });

  const { history, lastParts } = buildGeminiMessages(messages);

  const chat = genModel.startChat({
    history,
    generationConfig: {
      maxOutputTokens: params.maxOutputTokens ?? 16384,
      temperature: params.temperature ?? 0.7,
    },
  });

  const result = await chat.sendMessageStream(lastParts);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
