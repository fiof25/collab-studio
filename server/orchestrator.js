import { runRouterAgent } from './agents/routerAgent.js';
import { runQuestionAgent } from './agents/questionAgent.js';
import { runPromptAgent } from './agents/promptAgent.js';
import { runCoderAgent } from './agents/coderAgent.js';
import { runChatAgent } from './agents/chatAgent.js';
import { config as aiConfig } from './config/models.js';

/** Truncate to ~50 words */
function truncate(text, maxWords = 50) {
  const words = text.split(/\s+/);
  return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '…' : text;
}

/** Build a short summary of recent messages for the router */
function summarizeRecent(messages) {
  return messages
    .slice(-3)
    .map((m) => `${m.role}: ${truncate(m.content)}`)
    .join('\n');
}

/** Check if the previous assistant message was a question round */
function detectAfterQuestion(messages) {
  if (messages.length < 2) return false;
  const last = messages[messages.length - 1];
  const prev = messages[messages.length - 2];
  // If previous message was from assistant and was short (question lead-in),
  // and current is from user (answering), treat as post-question
  return prev?.role === 'assistant' && (prev.content?.length ?? 0) < 100 && last?.role === 'user';
}

/** Write an SSE event */
function sendSSE(res, data) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Mock mode responses ──────────────────────────────────────────────

const MOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mock App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen flex items-center justify-center">
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Hello from Mock Mode</h1>
    <p class="text-slate-400">AI provider not configured — this is a placeholder build.</p>
  </div>
</body>
</html>`;

const MOCK_QUESTIONS = [
  {
    id: 'direction',
    label: 'What kind of project are you thinking?',
    options: [
      { key: 'A', label: 'An interactive game' },
      { key: 'B', label: 'A dashboard or data tool' },
      { key: 'C', label: 'A marketing or portfolio site' },
      { key: 'X', label: 'Something else — describe your idea' },
    ],
  },
];

async function handleMock(req, res) {
  const { messages = [] } = req.body;
  const lastMessage = messages[messages.length - 1]?.content || '';
  const isVague = lastMessage.split(/\s+/).length < 5;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  if (isVague && !detectAfterQuestion(messages)) {
    // Mock question path
    sendSSE(res, { type: 'route', route: 'question' });
    await delay(200);
    sendSSE(res, { type: 'text', text: "Let me understand what you're looking for!" });
    await delay(100);
    sendSSE(res, { type: 'questions', data: MOCK_QUESTIONS });
  } else {
    // Mock build path
    sendSSE(res, { type: 'route', route: 'build' });
    await delay(200);

    const chatText = "Building that for you now! This will be a clean, modern design with smooth interactions.";
    const words = chatText.split(' ');
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2).join(' ') + ' ';
      sendSSE(res, { type: 'text', text: chunk });
      await delay(40);
    }

    await delay(300);
    sendSSE(res, { type: 'code', html: MOCK_HTML });
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

// ── Live mode ────────────────────────────────────────────────────────

export async function handleChat(req, res) {
  const isMock = !aiConfig.apiKey || aiConfig.apiKey === 'your_key_here';
  if (isMock) return handleMock(req, res);

  const { messages = [], currentCode = '', tier = 'large', blueprint } = req.body;
  const apiKey = aiConfig.apiKey;

  let aborted = false;
  req.on('close', () => { aborted = true; });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const recentContext = summarizeRecent(messages);
    const hasCode = !!currentCode;
    const afterQuestion = detectAfterQuestion(messages);

    // ── Router ──
    const routerResult = await runRouterAgent({ lastMessage, recentContext, hasCode, afterQuestion, apiKey });
    const route = routerResult.route;
    console.log(`[pipeline] Route: ${route} (afterQuestion: ${afterQuestion})`);
    sendSSE(res, { type: 'route', route });

    if (aborted) { res.end(); return; }

    // ── Chat path ──
    if (route === 'chat') {
      for await (const chunk of runChatAgent({ messages, mode: 'chat', apiKey })) {
        if (aborted) break;
        sendSSE(res, { type: 'text', text: chunk });
      }
    }

    // ── Question path ──
    else if (route === 'question') {
      const qResult = await runQuestionAgent({ lastMessage, recentContext, hasCode, apiKey });
      if (qResult.success && qResult.text) {
        sendSSE(res, { type: 'text', text: qResult.text });
      }
      if (qResult.success && qResult.questions?.length) {
        sendSSE(res, { type: 'questions', data: qResult.questions });
      }
    }

    // ── Build path ──
    else {
      // Step 1: Prompt Builder (blocking)
      const promptResult = await runPromptAgent({ messages, currentCode, blueprint, tier, apiKey });
      if (aborted) { res.end(); return; }

      const { instructions, summary } = promptResult;
      console.log(`[pipeline] Prompt Builder: ${instructions.slice(0, 80)}...`);

      // Step 2: Coder + Chat in parallel
      const coderPromise = runCoderAgent({ instructions, currentCode, tier, apiKey });

      // Stream chat while coder runs (protected so coderPromise is always awaited)
      try {
        for await (const chunk of runChatAgent({ messages, mode: 'build', summary, apiKey })) {
          if (aborted) break;
          sendSSE(res, { type: 'text', text: chunk });
        }
      } catch (chatErr) {
        console.error('[pipeline] Chat agent error:', chatErr.message);
        sendSSE(res, { type: 'text', text: 'Working on your request...' });
      }

      if (aborted) { res.end(); return; }

      // Await coder result
      const coderResult = await coderPromise;
      console.log(`[pipeline] Coder: ${coderResult.success ? `${coderResult.html.length} chars` : coderResult.error}`);
      if (coderResult.success && coderResult.html) {
        sendSSE(res, { type: 'code', html: coderResult.html });
      } else {
        sendSSE(res, { type: 'text', text: `\n\n⚠️ Code generation failed: ${coderResult.error || 'empty response'}` });
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Orchestrator error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message ?? 'Internal server error' });
    } else {
      sendSSE(res, { type: 'text', text: `\n\n⚠️ ${err.message}` });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
