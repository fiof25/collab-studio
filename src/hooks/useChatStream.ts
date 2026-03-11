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
  return `You are a vibe coding AI assistant helping build web prototypes collaboratively.

Current HTML in this branch:
\`\`\`html
${currentCode || '(empty — write a fresh page)'}
\`\`\`

RULES:
- When the user asks for UI/code changes, reply with a brief explanation then the COMPLETE updated HTML in a \`\`\`html block.
- Always return the FULL HTML file — never partial snippets.
- Keep all styles in a <style> tag. No external CSS frameworks.
- Design aesthetic: clean, modern, professional. Use system-ui fonts, restrained colors.
- For pure questions / feedback with no code change, reply conversationally with no code block.
- Be concise. Lead with what changed.`;
}

const MOCK_RESPONSE = `Here's a clean blue website for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Blue</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#1d4ed8;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem}
    h1{font-size:3rem;font-weight:800;letter-spacing:-0.04em;margin-bottom:1rem}
    p{font-size:1.125rem;color:#bfdbfe;max-width:480px;line-height:1.7;margin-bottom:2rem}
    .btn{background:#fff;color:#1d4ed8;border:none;padding:0.875rem 2rem;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer}
    .btn:hover{background:#eff6ff}
  </style>
</head>
<body>
  <h1>Everything is blue</h1>
  <p>A bold, clean blue site just for you. Ask me to change anything!</p>
  <button class="btn">Get started</button>
</body>
</html>
\`\`\`

Let me know what to change next!`;

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
              generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
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
