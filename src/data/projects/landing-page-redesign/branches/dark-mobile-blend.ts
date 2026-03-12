import type { Comment } from '@/types/branch';
import { alice, bob } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Dark Mobile</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#fafafa}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid #18181b;position:sticky;top:0;background:rgba(9,9,11,0.95);backdrop-filter:blur(8px)}
    .logo{font-size:0.9375rem;font-weight:700}
    .hamburger{display:flex;flex-direction:column;gap:4px;cursor:pointer}
    .hamburger span{display:block;width:18px;height:1.5px;background:#a1a1aa;border-radius:2px}
    .hero{padding:3.5rem 1.5rem 2.5rem}
    h1{font-size:2.25rem;font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:0.875rem}
    .sub{font-size:0.9375rem;color:#71717a;margin-bottom:2rem;line-height:1.65}
    .btn-lg{display:block;width:100%;background:#fff;color:#09090b;border:none;padding:0.9375rem;border-radius:9px;font-size:0.9375rem;font-weight:700;cursor:pointer;text-align:center;margin-bottom:0.75rem}
    .btn-ghost{display:block;width:100%;background:transparent;border:1px solid #27272a;color:#a1a1aa;padding:0.9375rem;border-radius:9px;font-size:0.9375rem;cursor:pointer;text-align:center}
    .divider{height:1px;background:#18181b;margin:2rem 0}
    .section-label{font-size:0.75rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#52525b;margin-bottom:1rem;padding:0 1.5rem}
    .cards{display:flex;flex-direction:column;gap:0.75rem;padding:0 1.5rem 3rem}
    .card{background:#18181b;border:1px solid #27272a;border-radius:10px;padding:1.125rem;display:flex;align-items:flex-start;gap:0.875rem}
    .card-icon{width:32px;height:32px;background:#27272a;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.875rem}
    .card-text h3{font-size:0.875rem;font-weight:600;margin-bottom:0.25rem;color:#fafafa}
    .card-text p{font-size:0.8125rem;color:#52525b;line-height:1.5}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <div class="hamburger"><span></span><span></span><span></span></div>
  </nav>
  <section class="hero">
    <h1>Build. Ship.<br/>Repeat.</h1>
    <p class="sub">The platform your engineering team actually loves. Fast, flexible, and built for scale.</p>
    <button class="btn-lg">Get started free</button>
    <button class="btn-ghost">See a demo</button>
  </section>
  <div class="divider"></div>
  <p class="section-label">Everything you need</p>
  <div class="cards">
    <div class="card"><div class="card-icon">⚡</div><div class="card-text"><h3>Instant deploys</h3><p>Push to any environment in seconds. No downtime.</p></div></div>
    <div class="card"><div class="card-icon">👥</div><div class="card-text"><h3>Live collaboration</h3><p>Real-time presence and async reviews, built in.</p></div></div>
    <div class="card"><div class="card-icon">🔒</div><div class="card-text"><h3>Enterprise security</h3><p>SOC 2 compliant with SAML SSO and audit logs.</p></div></div>
    <div class="card"><div class="card-icon">🌐</div><div class="card-text"><h3>Global edge network</h3><p>30+ regions. Sub-50ms latency for every user.</p></div></div>
  </div>
</body>
</html>`;

export const comments: Comment[] = [
  {
    id: 'cmt_b1',
    branchId: 'branch_blend',
    authorId: bob.id,
    authorName: bob.name,
    authorAvatarUrl: bob.avatarUrl,
    authorColor: bob.color,
    content: 'The dark + mobile blend feels cohesive. Card list on dark bg hits different — very polished.',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    x: 45,
    y: 42,
  },
  {
    id: 'cmt_b2',
    branchId: 'branch_blend',
    authorId: alice.id,
    authorName: alice.name,
    authorAvatarUrl: alice.avatarUrl,
    authorColor: alice.color,
    content: 'Typography hierarchy here is the best across all versions — the size contrast is just right.',
    timestamp: Date.now() - 1000 * 60 * 60 * 1,
    x: 30,
    y: 25,
  },
];

export const metadata = {
  id: 'branch_blend',
  name: 'dark-mobile-blend',
  description: 'Dark theme meets mobile-first — card list layout on dark zinc background.',
  status: 'merged' as const,
  color: '#EC4899',
  collaborators: [alice, bob],
  tags: ['blend', 'dark-theme', 'mobile'],
};
