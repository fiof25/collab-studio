import type { Comment } from '@/types/branch';
import { alice, bob, clara } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Hero Redesign</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2.5rem;background:#fff;border-bottom:1px solid #e2e8f0}
    .logo{font-size:0.9375rem;font-weight:700}
    .nav-r{display:flex;align-items:center;gap:1.25rem}
    .nav-r a{font-size:0.875rem;color:#64748b;text-decoration:none}
    .btn{background:#2563eb;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:600;cursor:pointer}
    .hero{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;max-width:1100px;margin:0 auto;padding:5rem 2.5rem}
    .badge{display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:0.75rem;font-weight:600;padding:0.25rem 0.75rem;border-radius:999px;margin-bottom:1.25rem;border:1px solid #bfdbfe}
    h1{font-size:2.75rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:1rem;color:#0f172a}
    .sub{font-size:1rem;color:#475569;margin-bottom:2rem;line-height:1.7}
    .cta-row{display:flex;gap:0.75rem;align-items:center}
    .btn-lg{background:#2563eb;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:7px;font-size:0.9375rem;font-weight:600;cursor:pointer}
    .link{font-size:0.875rem;color:#64748b;cursor:pointer}
    .mockup{background:#fff;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden}
    .mock-bar{height:32px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 12px;gap:6px}
    .dot{width:8px;height:8px;border-radius:50%}
    .mock-body{padding:16px;display:flex;flex-direction:column;gap:10px}
    .line{height:8px;background:#e2e8f0;border-radius:4px}
    .block{height:48px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <div class="nav-r">
      <a href="#">Docs</a><a href="#">Pricing</a>
      <button class="btn">Get Started Free</button>
    </div>
  </nav>
  <section class="hero">
    <div>
      <span class="badge">Now in public beta</span>
      <h1>Build and ship<br/>with confidence</h1>
      <p class="sub">Launchpad gives your team one place to prototype, review, and ship — no context switching required.</p>
      <div class="cta-row">
        <button class="btn-lg">Start building</button>
        <span class="link">Watch demo →</span>
      </div>
    </div>
    <div class="mockup">
      <div class="mock-bar">
        <div class="dot" style="background:#f87171"></div>
        <div class="dot" style="background:#fbbf24"></div>
        <div class="dot" style="background:#4ade80"></div>
      </div>
      <div class="mock-body">
        <div class="line" style="width:55%"></div>
        <div class="line" style="width:80%"></div>
        <div class="block"></div>
        <div class="line" style="width:65%"></div>
        <div class="line" style="width:45%"></div>
        <div class="line" style="width:70%"></div>
      </div>
    </div>
  </section>
</body>
</html>`;

export const comments: Comment[] = [
  {
    id: 'cmt_h1',
    branchId: 'branch_hero',
    authorId: clara.id,
    authorName: clara.name,
    authorAvatarUrl: clara.avatarUrl,
    authorColor: clara.color,
    content: 'The two-col layout is way stronger — the right visual gives the eye somewhere to go.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
    x: 72,
    y: 35,
  },
  {
    id: 'cmt_h2',
    branchId: 'branch_hero',
    authorId: bob.id,
    authorName: bob.name,
    authorAvatarUrl: bob.avatarUrl,
    authorColor: bob.color,
    content: "CTA colour switch from black to blue reads much warmer. Let's keep it — feels less aggressive.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3.5,
    x: 34,
    y: 62,
  },
  {
    id: 'cmt_h3',
    branchId: 'branch_hero',
    authorId: alice.id,
    authorName: alice.name,
    authorAvatarUrl: alice.avatarUrl,
    authorColor: alice.color,
    content: "H1 tracking could go a little tighter — maybe -0.05em? It'll feel more intentional at large sizes.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    x: 22,
    y: 28,
  },
];

export const metadata = {
  id: 'branch_hero',
  name: 'hero-redesign',
  description: 'Two-column layout with product mockup on right and a blue CTA.',
  status: 'active' as const,
  color: '#06B6D4',
  collaborators: [alice, clara],
  tags: ['ui', 'two-column', 'hero'],
};
