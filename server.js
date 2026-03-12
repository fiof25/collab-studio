import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { blueprintRouter } from './server/routes/blueprint.js';
import { mergeRouter } from './server/routes/merge.js';
import { createRateLimiter } from './server/middleware/rateLimit.js';
import { config as aiConfig } from './server/config/models.js';
import { handleChat } from './server/orchestrator.js';

config();

const app = express();
const PORT = 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost dev servers and sandboxed iframes (null origin)
    if (!origin || origin === 'null' || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '4mb' }));

app.use('/api/blueprint', createRateLimiter({ maxCalls: 10, windowMs: 60_000 }), blueprintRouter);
app.use('/api/merge', createRateLimiter({ maxCalls: 5, windowMs: 60_000 }), mergeRouter);

// Image generation endpoint (Gemini only) — used by in-preview prototypes
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini image API error:', response.status, errBody);
      return res.status(502).json({ error: `Gemini API error: ${response.status}` });
    }

    const result = await response.json();
    const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart) return res.status(502).json({ error: 'No image in Gemini response' });

    res.json({ image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
});

// Expose active AI config to frontend (provider + model names)
app.get('/api/config', (_req, res) => {
  res.json({
    provider: aiConfig.provider,
    models: aiConfig.models,
    mock: !aiConfig.apiKey || aiConfig.apiKey === 'your_key_here',
  });
});

app.post('/api/chat', handleChat);

app.listen(PORT, () => {
  const mode = (!aiConfig.apiKey || aiConfig.apiKey === 'your_key_here') ? 'MOCK' : 'LIVE';
  console.log(`\n🚀 Chat proxy running on http://localhost:${PORT}`);
  console.log(`   Provider: ${aiConfig.provider} | Model: ${aiConfig.models.large}`);
  console.log(`   Mode: ${mode} ${mode === 'MOCK' ? `(add ${aiConfig.provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY'} to .env)` : '✓'}\n`);
});
