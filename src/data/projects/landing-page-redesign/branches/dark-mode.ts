import type { Comment } from '@/types/branch';
import { alice, bob, clara } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Dark Theme</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f1f5f9}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2rem;border-bottom:1px solid #1e293b;position:sticky;top:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(8px)}
    .logo{font-size:0.9375rem;font-weight:700;color:#f1f5f9}
    nav ul{display:flex;gap:1.5rem;list-style:none}
    nav ul a{font-size:0.875rem;color:#94a3b8;text-decoration:none}
    .btn{background:#3b82f6;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:600;cursor:pointer}
    .hero{max-width:580px;margin:0 auto;padding:5rem 2rem;text-align:center}
    h1{font-size:2.75rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:1rem}
    .sub{font-size:1.0625rem;color:#94a3b8;margin-bottom:2rem;line-height:1.65}
    .cta-row{display:flex;gap:0.75rem;justify-content:center}
    .btn-lg{background:#3b82f6;color:#fff;border:none;padding:0.75rem 1.625rem;border-radius:7px;font-size:0.9375rem;font-weight:600;cursor:pointer}
    .btn-ghost{background:transparent;border:1px solid #1e293b;color:#94a3b8;padding:0.75rem 1.625rem;border-radius:7px;font-size:0.9375rem;cursor:pointer}
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;max-width:860px;margin:0 auto 4rem;padding:0 2rem}
    .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:1.25rem}
    .card-icon{width:28px;height:28px;background:#172554;border-radius:6px;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:center;color:#60a5fa;font-size:0.875rem}
    .card h3{font-size:0.875rem;font-weight:600;margin-bottom:0.375rem;color:#f1f5f9}
    .card p{font-size:0.8125rem;color:#64748b;line-height:1.6}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <ul><li><a href="#">Product</a></li><li><a href="#">Pricing</a></li><li><a href="#">Docs</a></li></ul>
    <button class="btn">Get Started</button>
  </nav>
  <section class="hero">
    <h1>Ship faster,<br/>together</h1>
    <p class="sub">The dev platform that keeps your team in sync — from first commit to production.</p>
    <div class="cta-row">
      <button class="btn-lg">Start for free</button>
      <button class="btn-ghost">Learn more</button>
    </div>
  </section>
  <div class="features">
    <div class="card"><div class="card-icon">⚡</div><h3>Fast deploys</h3><p>Push to prod in under 30 seconds, every time.</p></div>
    <div class="card"><div class="card-icon">👥</div><h3>Live collab</h3><p>Review and merge changes in real-time with your team.</p></div>
    <div class="card"><div class="card-icon">🔧</div><h3>Zero config</h3><p>Connect your repo and go. No setup required.</p></div>
  </div>
</body>
</html>`;

export const comments: Comment[] = [
  {
    id: 'cmt_d1',
    branchId: 'branch_dark',
    authorId: bob.id,
    authorName: bob.name,
    authorAvatarUrl: bob.avatarUrl,
    authorColor: bob.color,
    content: 'Background is a nice dark zinc — not pure black, which is good. Contrast feels accessible.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    x: 50,
    y: 10,
  },
  {
    id: 'cmt_d2',
    branchId: 'branch_dark',
    authorId: clara.id,
    authorName: clara.name,
    authorAvatarUrl: clara.avatarUrl,
    authorColor: clara.color,
    content: 'Card borders at 1px #333 are too subtle on the dark bg — try bumping to #444 or a faint glow.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2.5,
    x: 28,
    y: 68,
  },
  {
    id: 'cmt_d3',
    branchId: 'branch_dark',
    authorId: alice.id,
    authorName: alice.name,
    authorAvatarUrl: alice.avatarUrl,
    authorColor: alice.color,
    content: 'Love the violet CTA — pops well without being loud. This might influence the main version.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
    x: 52,
    y: 52,
  },
];

export const metadata = {
  id: 'branch_dark',
  name: 'dark-mode',
  description: 'Dark navy background, white text, sticky nav, feature cards section.',
  status: 'active' as const,
  color: '#A855F7',
  collaborators: [bob],
  tags: ['dark-theme', 'accessibility'],
};
