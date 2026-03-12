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
  if (res.writableEnded) {
    console.warn('[SSE] DROPPED (stream ended):', data.type, data.type === 'text' ? data.text?.slice(0, 60) : '');
    return;
  }
  console.log(`[SSE] → ${data.type}${data.type === 'text' ? `: "${data.text?.slice(0, 60)}"` : data.type === 'route' ? `: ${data.route}` : data.type === 'code' ? `: ${data.html?.length} chars` : ''}`);
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
  console.log(`\n${'='.repeat(60)}\n[pipeline] POST /api/chat | mock=${isMock} | provider=${aiConfig.provider} | model=${aiConfig.models?.large}`);
  if (isMock) return handleMock(req, res);

  const { messages = [], currentCode = '', tier = 'large', blueprint } = req.body;
  const apiKey = aiConfig.apiKey;

  console.log(`[pipeline] Messages: ${messages.length}, lastMsg: "${messages[messages.length - 1]?.content?.slice(0, 80)}", hasCode: ${!!currentCode}, tier: ${tier}`);

  let aborted = false;
  res.on('close', () => { aborted = true; console.warn('[pipeline] ⚠ Client disconnected (res close)'); });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const recentContext = summarizeRecent(messages);
    const hasCode = !!currentCode;
    const afterQuestion = detectAfterQuestion(messages);

    // ── Router ──
    console.log('[pipeline] 1/4 Running router...');
    const routerResult = await runRouterAgent({ lastMessage, recentContext, hasCode, afterQuestion, apiKey });
    const route = routerResult.route;
    console.log(`[pipeline] 1/4 Router done → route=${route} (afterQuestion: ${afterQuestion})`);
    sendSSE(res, { type: 'route', route });

    if (aborted) { console.log('[pipeline] ABORTED after router'); res.end(); return; }

    // ── Chat path ──
    if (route === 'chat') {
      console.log('[pipeline] 2/4 Chat path — streaming chat agent...');
      let chatChunks = 0;
      for await (const chunk of runChatAgent({ messages, mode: 'chat', apiKey })) {
        if (aborted) break;
        chatChunks++;
        sendSSE(res, { type: 'text', text: chunk });
      }
      console.log(`[pipeline] 2/4 Chat agent done — ${chatChunks} chunks`);
    }

    // ── Question path ──
    else if (route === 'question') {
      console.log('[pipeline] 2/4 Question path — running question agent...');
      const qResult = await runQuestionAgent({ lastMessage, recentContext, hasCode, apiKey });
      console.log(`[pipeline] 2/4 Question agent done — success=${qResult.success}, questions=${qResult.questions?.length}`);
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
      console.log('[pipeline] 2/4 Build path — running prompt agent...');
      const promptResult = await runPromptAgent({ messages, currentCode, blueprint, tier, apiKey });
      console.log(`[pipeline] 2/4 Prompt agent done — success=${promptResult.success}, instructions=${promptResult.instructions?.length} chars`);
      if (aborted) { console.log('[pipeline] ABORTED after prompt agent'); res.end(); return; }

      const { instructions, summary } = promptResult;
      console.log(`[pipeline] Summary: "${summary?.slice(0, 80)}"`);

      // Step 2: Coder + Chat in parallel
      console.log('[pipeline] 3/4 Starting coder agent (async)...');
      const coderPromise = runCoderAgent({ instructions, currentCode, tier, apiKey });

      // Stream chat while coder runs (protected so coderPromise is always awaited)
      console.log('[pipeline] 3/4 Starting chat agent (streaming)...');
      let chatChunks = 0;
      try {
        for await (const chunk of runChatAgent({ messages, mode: 'build', summary, apiKey })) {
          if (aborted) break;
          chatChunks++;
          sendSSE(res, { type: 'text', text: chunk });
        }
        console.log(`[pipeline] 3/4 Chat agent done — ${chatChunks} chunks streamed`);
      } catch (chatErr) {
        console.error('[pipeline] 3/4 Chat agent CRASHED:', chatErr);
        sendSSE(res, { type: 'text', text: 'Working on your request...' });
      }

      if (aborted) { console.log('[pipeline] ABORTED after chat agent'); res.end(); return; }

      // Await coder result
      console.log('[pipeline] 4/4 Awaiting coder result...');
      const coderResult = await coderPromise;
      console.log(`[pipeline] 4/4 Coder done — success=${coderResult.success}, html=${coderResult.html?.length ?? 0} chars, error=${coderResult.error ?? 'none'}`);
      if (coderResult.success && coderResult.html) {
        sendSSE(res, { type: 'code', html: coderResult.html });

        // Step 5: Recap — describe what was built in plain language
        if (!aborted) {
          console.log('[pipeline] 5/5 Starting recap agent...');
          try {
            sendSSE(res, { type: 'text', text: '\n\n' });
            for await (const chunk of runChatAgent({ mode: 'recap', html: coderResult.html, apiKey })) {
              if (aborted) break;
              sendSSE(res, { type: 'text', text: chunk });
            }
            console.log('[pipeline] 5/5 Recap done');
          } catch (recapErr) {
            console.error('[pipeline] 5/5 Recap error:', recapErr.message);
          }
        }
      } else {
        sendSSE(res, { type: 'text', text: `\n\n⚠️ Code generation failed: ${coderResult.error || 'empty response'}` });
      }
    }

    console.log('[pipeline] ✓ Done — sending [DONE]');
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[pipeline] ✗ TOP-LEVEL ERROR:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message ?? 'Internal server error' });
    } else {
      sendSSE(res, { type: 'text', text: `\n\n⚠️ ${err.message}` });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
