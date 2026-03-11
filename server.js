import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { blueprintRouter } from './server/routes/blueprint.js';
import { mergeRouter } from './server/routes/merge.js';
import { createRateLimiter } from './server/middleware/rateLimit.js';

config();

const app = express();
const PORT = 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CHAT_MODEL = 'claude-sonnet-4-6';

// Load system prompt from COLLABSTUDIO.md at startup
let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = readFileSync(new URL('./COLLABSTUDIO.md', import.meta.url), 'utf8');
  console.log('✓ Loaded COLLABSTUDIO.md system prompt');
} catch {
  console.warn('⚠ COLLABSTUDIO.md not found — using inline fallback prompt');
  SYSTEM_PROMPT = 'You are a vibe coding AI. Help users iterate on HTML prototypes. Return the FULL updated HTML in a ```html block when making changes.';
}

const CONTEXT_WINDOW = 8; // most recent messages to include in sliding window

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '4mb' }));

app.use('/api/blueprint', createRateLimiter({ maxCalls: 10, windowMs: 60_000 }), blueprintRouter);
app.use('/api/merge', createRateLimiter({ maxCalls: 5, windowMs: 60_000 }), mergeRouter);


const MOCK_RESPONSE = `Added a logo bar and a 3-column feature grid below the hero.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Build faster</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2.5rem;border-bottom:1px solid #e5e7eb}
    .logo{font-size:0.9375rem;font-weight:700}
    .nav-c{display:flex;gap:1.5rem}
    .nav-c a{font-size:0.875rem;color:#6b7280;text-decoration:none}
    .nav-r{display:flex;gap:0.75rem;align-items:center}
    .btn-sm{font-size:0.875rem;color:#6b7280;background:none;border:none;cursor:pointer}
    .btn{background:#111;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:500;cursor:pointer}
    .hero{text-align:center;padding:5rem 2rem 3.5rem;max-width:600px;margin:0 auto}
    h1{font-size:2.75rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:0.875rem}
    .sub{font-size:1rem;color:#6b7280;margin-bottom:1.75rem;line-height:1.65}
    .cta-row{display:flex;gap:0.625rem;justify-content:center}
    .btn-lg{background:#111;color:#fff;border:none;padding:0.7rem 1.5rem;border-radius:7px;font-size:0.9375rem;font-weight:600;cursor:pointer}
    .btn-outline{background:transparent;border:1px solid #d1d5db;color:#374151;padding:0.7rem 1.5rem;border-radius:7px;font-size:0.9375rem;cursor:pointer}
    .logos{border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;padding:1.125rem 2rem;display:flex;align-items:center;justify-content:center;gap:2rem}
    .logos span{font-size:0.8rem;font-weight:600;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase}
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;max-width:900px;margin:3rem auto;padding:0 2.5rem 4rem}
    .feat{padding:1.375rem;border:1px solid #e5e7eb;border-radius:10px}
    .feat-icon{width:32px;height:32px;background:#f3f4f6;border-radius:7px;margin-bottom:0.875rem;display:flex;align-items:center;justify-content:center;font-size:0.9rem}
    .feat h3{font-size:0.875rem;font-weight:600;margin-bottom:0.375rem}
    .feat p{font-size:0.8125rem;color:#6b7280;line-height:1.6}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <div class="nav-c"><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a></div>
    <div class="nav-r"><button class="btn-sm">Sign in</button><button class="btn">Get started</button></div>
  </nav>
  <section class="hero">
    <h1>Ship faster,<br/>together</h1>
    <p class="sub">One platform for your entire development lifecycle — from idea to production.</p>
    <div class="cta-row">
      <button class="btn-lg">Get started free</button>
      <button class="btn-outline">View demo</button>
    </div>
  </section>
  <div class="logos">
    <span>Stripe</span><span>Vercel</span><span>Linear</span><span>Figma</span><span>Notion</span>
  </div>
  <div class="features">
    <div class="feat"><div class="feat-icon">⚡</div><h3>Instant deploys</h3><p>Push to any environment in seconds. Zero downtime.</p></div>
    <div class="feat"><div class="feat-icon">👥</div><h3>Team collaboration</h3><p>Real-time presence, live reviews, async threads.</p></div>
    <div class="feat"><div class="feat-icon">📊</div><h3>Analytics built in</h3><p>Core Web Vitals and error tracking out of the box.</p></div>
  </div>
</body>
</html>
\`\`\`

Let me know what to tweak next!`;

function buildClaudeMessages(messages, currentCode) {
  // Inject current code as context at the top of the conversation
  const codeContext = `## Current Branch Code\n\n\`\`\`html\n${currentCode || '<!-- No code yet — start fresh! -->'}\n\`\`\`\n\n---\n\n`;

  // Sliding window: keep the most recent N messages
  const window = messages.slice(-CONTEXT_WINDOW);

  if (window.length === 0) {
    return [{ role: 'user', content: codeContext + 'Hello! What can you help me build?' }];
  }

  // Prepend code context to the first user message in the window
  return window.map((msg, i) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: i === 0 && msg.role === 'user' ? codeContext + msg.content : msg.content,
  }));
}

app.post('/api/chat', async (req, res) => {
  const { messages = [], currentCode = '' } = req.body;

  // Mock mode if API key is missing
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_key_here') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const words = MOCK_RESPONSE.split(' ');
    let i = 0;
    const interval = setInterval(() => {
      if (i >= words.length) {
        res.write('data: [DONE]\n\n');
        res.end();
        clearInterval(interval);
        return;
      }
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      i += 3;
    }, 40);

    req.on('close', () => clearInterval(interval));
    return;
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const claudeMessages = buildClaudeMessages(messages, currentCode);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 8192,
      temperature: 1, // required for claude-sonnet-4-6
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (req.closed) break;
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message ?? 'Internal server error' });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  const mode = (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_key_here') ? 'MOCK' : 'LIVE';
  console.log(`\n🚀 Chat proxy running on http://localhost:${PORT}`);
  console.log(`   Mode: ${mode} ${mode === 'MOCK' ? '(add ANTHROPIC_API_KEY to .env for real API)' : `✓ (${CHAT_MODEL})`}\n`);
});
