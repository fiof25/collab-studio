import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
const PORT = 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const MOCK_RESPONSE = `I'll help you improve this prototype! Here's what I'd suggest for your landing page.

Let me add a features section and improve the overall design:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Product Landing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
    nav { padding: 1rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    nav .logo { font-weight: 700; font-size: 1.2rem; }
    nav .cta { background: #111; color: #fff; padding: 0.5rem 1.2rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; border: none; }
    .hero { padding: 6rem 2rem; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 480px; margin: 0 auto 2rem; }
    .hero .btn { background: white; color: #764ba2; padding: 0.9rem 2.5rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; border: none; }
    .features { padding: 5rem 2rem; max-width: 960px; margin: 0 auto; }
    .features h2 { text-align: center; font-size: 2rem; font-weight: 700; margin-bottom: 3rem; }
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    .feature-card { padding: 1.5rem; border: 1px solid #eee; border-radius: 12px; }
    .feature-card .icon { font-size: 1.5rem; margin-bottom: 0.75rem; }
    .feature-card h3 { font-weight: 600; margin-bottom: 0.5rem; }
    .feature-card p { color: #666; font-size: 0.9rem; line-height: 1.6; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Launchpad</span>
    <button class="cta">Get Started</button>
  </nav>
  <section class="hero">
    <h1>Build Something Incredible</h1>
    <p>The fastest way to take your idea from zero to shipped. No fluff, just results.</p>
    <button class="btn">Start for free →</button>
  </section>
  <section class="features">
    <h2>Everything you need</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="icon">⚡</div>
        <h3>Lightning Fast</h3>
        <p>Deploy in seconds. Our infrastructure handles scale so you don't have to.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔒</div>
        <h3>Secure by Default</h3>
        <p>Built-in security best practices, so your users' data stays safe.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🤝</div>
        <h3>Team-Ready</h3>
        <p>Collaborate with your team in real-time. Everyone stays in sync.</p>
      </div>
    </div>
  </section>
</body>
</html>
\`\`\`

This adds a gradient hero section and a features grid. Let me know what you'd like to change next!`;

function buildSystemPrompt(currentCode) {
  return `You are a vibe coding AI assistant helping build web prototypes collaboratively. The user is iterating on a branch of their project.

Current code in this branch:
\`\`\`html
${currentCode}
\`\`\`

RULES:
- When the user asks for UI/code changes, respond with a brief explanation followed by the COMPLETE updated HTML file in a \`\`\`html code block.
- Always return the FULL HTML file — never partial snippets.
- Keep styles inline in <style> tags (no external CSS frameworks).
- When the user is asking questions or giving feedback without requesting changes, respond conversationally without a code block.
- Be concise. Lead with what changed, then provide the code.`;
}

function buildGeminiContents(messages, currentCode) {
  const systemPrompt = buildSystemPrompt(currentCode);
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Got it! I\'ll help you iterate on this prototype. I\'ll return the full HTML when making changes, and chat conversationally for questions. What would you like to do?' }] },
  ];

  for (const msg of messages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  return contents;
}

app.post('/api/chat', async (req, res) => {
  const { messages = [], currentCode = '' } = req.body;

  // Mock mode if API key is missing or placeholder
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_key_here') {
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

  const contents = buildGeminiContents(messages, currentCode);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, err);
      res.status(502).json({ error: `Gemini API error: ${geminiRes.status}` });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  const mode = (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_key_here') ? 'MOCK' : 'LIVE';
  console.log(`\n🚀 Chat proxy running on http://localhost:${PORT}`);
  console.log(`   Mode: ${mode} ${mode === 'MOCK' ? '(add GEMINI_API_KEY to .env for real API)' : '✓'}\n`);
});
