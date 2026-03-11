import { useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/store/useChatStore';
import { useProjectStore } from '@/store/useProjectStore';
import type { ProjectFile } from '@/types/branch';
import { captureHtmlScreenshot } from '@/utils/captureScreenshot';

const SERVER_URL = 'http://localhost:3001';

/** Fire-and-forget: generate blueprint + snapshot after a code checkpoint */
async function triggerAgents(
  branchId: string,
  branchName: string,
  parentBranchName: string | undefined,
  files: ProjectFile[],
  updateBlueprint: (id: string, bp: import('@/types/blueprint').Blueprint) => void,
  updateBranch: (id: string, patch: Parameters<ReturnType<typeof useProjectStore.getState>['updateBranch']>[1]) => void,
  screenshotBase64?: string | null,
  userPrompt?: string,
  aiSummary?: string,
) {
  // Run both in parallel — failures are silently ignored (server may not be running)
  const [bpRes, snapRes] = await Promise.allSettled([
    fetch(`${SERVER_URL}/api/blueprint/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, branchName, parentBranchName, files }),
    }).then((r) => r.json()),
    fetch(`${SERVER_URL}/api/blueprint/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, branchName, files, screenshotBase64, userPrompt, aiSummary }),
    }).then((r) => r.json()),
  ]);

  if (bpRes.status === 'fulfilled' && bpRes.value?.success) {
    updateBlueprint(branchId, bpRes.value.blueprint);
  }
  if (snapRes.status === 'fulfilled' && snapRes.value?.success && snapRes.value.description) {
    updateBranch(branchId, { description: snapRes.value.description });
  }
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-2.5-flash';

function extractHtmlBlock(text: string): string | null {
  const match = text.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function buildSystemPrompt(currentCode: string) {
  return `You are a world-class UI engineer and visual designer building stunning web prototypes. Your outputs look like they were made by a senior designer at Vercel, Linear, or Apple — not a tutorial site.

Current code in this branch:
\`\`\`html
${currentCode || '(empty — build a fresh page from scratch)'}
\`\`\`

═══════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════
- Code change requested → 1–2 sentence summary of what changed, then the FULL updated HTML in a single \`\`\`html block. The code block is always last. Never snippets or diffs.
- Question only, no change → reply conversationally, no code block.

═══════════════════════════════════
TECH STACK (non-negotiable)
═══════════════════════════════════
Every output must be a complete self-contained HTML file using:
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>

- All JSX in <script type="text/babel">
- Destructure React hooks at top: const { useState, useEffect, useRef, useCallback } = React;
- Use a <style> tag only for CSS keyframe animations (e.g. @keyframes float, shimmer, spin)
- Mount with: ReactDOM.createRoot(document.getElementById('root')).render(<App />);

═══════════════════════════════════
STRUCTURE — MINIMUM REQUIRED
═══════════════════════════════════
Every new page must include ALL of these unless the request is explicitly a single component:
1. Sticky navbar with logo, nav links, and a CTA button
2. Hero section — large headline (text-5xl md:text-7xl), subheading, 1-2 CTAs
3. At least 2 content sections (features grid, stats, testimonials, pricing, about, etc.)
4. Footer with links and copyright

Break the page into named React components (Navbar, Hero, Features, Footer, etc.) and compose them in App.

═══════════════════════════════════
VISUAL QUALITY — NEVER SKIMP
═══════════════════════════════════
These are REQUIRED, not optional:

Typography:
- Hero headline: text-5xl md:text-7xl font-black tracking-tight leading-none
- Use gradient text on key words: bg-gradient-to-r from-X to-Y bg-clip-text text-transparent
- Clear type hierarchy: headlines, subheadings, body, captions at distinct sizes

Depth & Texture:
- Multi-layer backgrounds: base color + radial gradients or mesh patterns using multiple divs
- Cards use glassmorphism: bg-white/5 border border-white/10 backdrop-blur-sm (dark) or bg-white shadow-xl (light)
- Subtle glows on CTAs: hover:shadow-lg hover:shadow-violet-500/25

Motion & Polish:
- All interactive elements need transitions: transition-all duration-200 or duration-300
- Hover states on every button, card, and link — color shift, lift, or glow
- Use CSS keyframe animations for at least one element (floating badge, shimmer, pulse glow)

Spacing:
- Sections: py-24 px-6, max-w-6xl mx-auto
- Cards in grids: gap-6, p-6 rounded-2xl
- Never cramped — white space is a design tool

═══════════════════════════════════
AESTHETIC — READ THE REQUEST
═══════════════════════════════════
Pick the right vibe, don't default to generic:

DARK / TECH / SAAS (Vercel, Linear, Stripe):
  bg-slate-950 or bg-gray-950 base
  Accents: violet-500, cyan-400, indigo-500
  Glassmorphism cards, sharp typography, subtle grid/noise texture overlay

LIGHT / MINIMAL / EDITORIAL (Apple, Notion, Figma):
  bg-white or bg-stone-50 base
  Accents: single restrained color (blue-600, rose-500, etc.)
  Generous whitespace, large serif or black-weight sans headlines, soft shadows

VIBRANT / CONSUMER / FAN (music, fashion, entertainment):
  Bold gradient backgrounds (purple→pink, orange→red)
  High-contrast cards, playful rounded shapes (rounded-3xl), emoji or icon accents
  Energetic color combinations, bold CTAs, fun hover animations

DARK DEFAULT: If the request is ambiguous, use the dark/tech aesthetic.

═══════════════════════════════════
CONTENT RULES
═══════════════════════════════════
- Write real, specific, compelling copy that fits the topic — no "Lorem ipsum", no "Your content here"
- For fan pages: include real info, section names, cultural context
- For SaaS: write actual feature names, real-sounding pricing, believable testimonials with names
- Placeholder images: https://picsum.photos/{width}/{height}?grayscale or add ?random={n} for variety

═══════════════════════════════════
ITERATION RULES
═══════════════════════════════════
- Only change what was explicitly asked. Preserve everything else exactly.
- Never reset or simplify the existing design — only add or refine.
- Match and extend the current aesthetic — don't introduce a conflicting style.`;
}

const MOCK_RESPONSE = `Here's a dark SaaS landing page built with React and Tailwind!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Launchpad</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950">
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;

    function Navbar() {
      return (
        <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="text-white font-bold text-lg tracking-tight">Launchpad</span>
            <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Product</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Docs</a>
            </div>
            <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              Get started
            </button>
          </div>
        </nav>
      );
    }

    function Hero() {
      return (
        <section className="pt-32 pb-24 px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
            Now in public beta
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-6">
            Ship faster<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              with AI
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Launchpad helps your team build, iterate, and deploy production-ready products in record time. No more bottlenecks.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25">
              Start for free
            </button>
            <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 font-semibold transition-all duration-200">
              View demo →
            </button>
          </div>
        </section>
      );
    }

    function Features() {
      const features = [
        { icon: "⚡", title: "Blazing fast", desc: "Deploy in seconds, not minutes. Our edge network puts your app closer to users worldwide." },
        { icon: "🔒", title: "Enterprise secure", desc: "SOC 2 Type II certified with end-to-end encryption and zero-trust architecture." },
        { icon: "🤖", title: "AI-powered", desc: "Intelligent suggestions, automated testing, and one-click performance optimization." },
      ];
      return (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 hover:bg-white/[0.07] transition-all duration-200">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    function App() {
      return (
        <div className="min-h-screen bg-slate-950">
          <Navbar />
          <Hero />
          <Features />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
\`\`\`

Ask me to change anything — add a pricing section, tweak the colors, make it more minimal, whatever you want.`;

async function* mockStream(text: string): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    yield words.slice(i, i + 3).join(' ') + ' ';
    await new Promise((r) => setTimeout(r, 30));
  }
}

export function useChatStream(branchId: string) {
  const abortRef = useRef<AbortController | null>(null);
  const { addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread } =
    useChatStore();
  const { getBranchById, updateBranch, updateBlueprint } = useProjectStore();

  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      abortRef.current = new AbortController();
      setStreaming(true);

      addUserMessage(branchId, trimmed);
      const assistantMsg = startAssistantMessage(branchId);

      const thread = getThread(branchId);
      const history = thread
        .filter((m) => m.id !== assistantMsg.id && !m.isStreaming)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

      const branch = getBranchById(branchId);
      const latestCkpt = branch?.checkpoints[branch.checkpoints.length - 1];
      const currentCode =
        latestCkpt?.files?.find((f) => f.path === 'index.html')?.content ??
        latestCkpt?.codeSnapshot ??
        '';

      let fullContent = '';

      try {
        if (!GEMINI_KEY) {
          // ── Mock mode ──────────────────────────────────────────────────────
          for await (const chunk of mockStream(MOCK_RESPONSE)) {
            if (abortRef.current?.signal.aborted) break;
            fullContent += chunk;
            appendChunk(branchId, assistantMsg.id, chunk);
          }
        } else {
          // ── Direct Gemini API call ─────────────────────────────────────────
          const contents = [
            { role: 'user', parts: [{ text: buildSystemPrompt(currentCode) }] },
            { role: 'model', parts: [{ text: "Got it! I'll help you build this. What would you like?" }] },
            ...history,
          ];

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
            }),
            signal: abortRef.current.signal,
          });

          if (!res.ok || !res.body) {
            const raw = await res.text().catch(() => `HTTP ${res.status}`);
            let detail = raw;
            try { detail = JSON.parse(raw)?.error?.message ?? raw; } catch { /* noop */ }
            throw new Error(detail);
          }

          const reader = res.body.getReader();
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
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                // Skip thinking parts (thought: true) — only stream actual response text
                const parts: Array<{ thought?: boolean; text?: string }> =
                  parsed.candidates?.[0]?.content?.parts ?? [];
                const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
                if (text) {
                  fullContent += text;
                  appendChunk(branchId, assistantMsg.id, text);
                }
              } catch { /* skip malformed */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const errMsg = `\n\n⚠️ ${(err as Error).message}`;
          fullContent += errMsg;
          appendChunk(branchId, assistantMsg.id, errMsg);
        }
      }

      // Save generated code as a new checkpoint → preview auto-updates
      const codeGenerated = extractHtmlBlock(fullContent) ?? undefined;
      if (codeGenerated) {
        const freshBranch = getBranchById(branchId);
        if (freshBranch) {
          updateBranch(branchId, {
            checkpoints: [
              ...freshBranch.checkpoints,
              {
                id: `ckpt_${nanoid(6)}`,
                branchId,
                label: `AI: ${trimmed.slice(0, 40)}${trimmed.length > 40 ? '…' : ''}`,
                timestamp: Date.now(),
                thumbnailUrl: '',
                codeSnapshot: codeGenerated,
                files: [{ path: 'index.html', content: codeGenerated, language: 'html' }],
              },
            ],
          });
        }
      }

      // Fire blueprint + snapshot agents after code checkpoint (non-blocking)
      if (codeGenerated) {
        const latestBranch = getBranchById(branchId);
        if (latestBranch) {
          const newFiles: ProjectFile[] = [{ path: 'index.html', content: codeGenerated, language: 'html' }];
          const parentBranch = latestBranch.parentId
            ? getBranchById(latestBranch.parentId)
            : undefined;
          // Extract AI's plain-English summary (everything before the code block)
          const aiSummary = fullContent.replace(/```html[\s\S]*?```/g, '').trim().slice(0, 300) || undefined;
          // Capture screenshot for vision-based description (best-effort)
          const screenshotBase64 = await captureHtmlScreenshot(codeGenerated).catch(() => null);
          triggerAgents(branchId, latestBranch.name, parentBranch?.name, newFiles, updateBlueprint, updateBranch, screenshotBase64, trimmed, aiSummary).catch(() => {});
        }
      }

      finalizeMessage(branchId, assistantMsg.id, codeGenerated);
      setStreaming(false);
      abortRef.current = null;
    },
    [branchId, addUserMessage, startAssistantMessage, appendChunk, finalizeMessage, setStreaming, getThread, getBranchById, updateBranch, updateBlueprint]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, abort };
}
