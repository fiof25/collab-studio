import type { Comment } from '@/types/branch';
import { alice, bob, clara } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Mobile First</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb}
    .logo{font-size:1rem;font-weight:700}
    .hamburger{display:flex;flex-direction:column;gap:4px;cursor:pointer;padding:4px}
    .hamburger span{display:block;width:20px;height:2px;background:#374151;border-radius:2px}
    .hero{padding:3rem 1.25rem 2.5rem}
    h1{font-size:2.25rem;font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:0.875rem}
    .sub{font-size:1rem;color:#6b7280;margin-bottom:1.75rem;line-height:1.65}
    .btn-lg{display:block;width:100%;background:#16a34a;color:#fff;border:none;padding:1rem;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;text-align:center;margin-bottom:0.75rem}
    .btn-ghost{display:block;width:100%;background:transparent;border:1px solid #d1d5db;color:#374151;padding:1rem;border-radius:10px;font-size:1rem;cursor:pointer;text-align:center}
    .trust{margin-top:2rem;padding-top:2rem;border-top:1px solid #f3f4f6}
    .trust p{font-size:0.8125rem;color:#9ca3af;margin-bottom:0.75rem}
    .avatars{display:flex;align-items:center;gap:0.5rem}
    .av{width:32px;height:32px;border-radius:50%;background:#e5e7eb;border:2px solid #fff}
    .av:nth-child(2){background:#dbeafe;margin-left:-10px}
    .av:nth-child(3){background:#dcfce7;margin-left:-10px}
    .av-count{font-size:0.8125rem;color:#6b7280;margin-left:4px}
    .cards{padding:0 1.25rem 3rem;display:flex;flex-direction:column;gap:0.875rem}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:1.125rem}
    .card h3{font-size:0.9375rem;font-weight:600;margin-bottom:0.375rem}
    .card p{font-size:0.875rem;color:#6b7280;line-height:1.6}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <div class="hamburger"><span></span><span></span><span></span></div>
  </nav>
  <section class="hero">
    <h1>Build. Ship.<br/>Repeat.</h1>
    <p class="sub">The platform your team actually wants to use. No friction, just flow.</p>
    <button class="btn-lg">Get started — it's free</button>
    <button class="btn-ghost">See a demo</button>
    <div class="trust">
      <p>Trusted by 1,200+ engineering teams</p>
      <div class="avatars">
        <div class="av"></div><div class="av"></div><div class="av"></div>
        <span class="av-count">+1,197 others</span>
      </div>
    </div>
  </section>
  <div class="cards">
    <div class="card"><h3>⚡ Fast deploys</h3><p>Push to prod in under 30 seconds.</p></div>
    <div class="card"><h3>👥 Real-time collab</h3><p>Your team stays in sync, always.</p></div>
    <div class="card"><h3>🔒 Secure by default</h3><p>SOC 2 compliant, end-to-end encrypted.</p></div>
  </div>
</body>
</html>`;

export const comments: Comment[] = [
  {
    id: 'cmt_m1',
    branchId: 'branch_mobile',
    authorId: clara.id,
    authorName: clara.name,
    authorAvatarUrl: clara.avatarUrl,
    authorColor: clara.color,
    content: 'Stacked layout on 390px looks clean. The logo + hamburger row has the right weight balance.',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    x: 50,
    y: 6,
  },
  {
    id: 'cmt_m2',
    branchId: 'branch_mobile',
    authorId: alice.id,
    authorName: alice.name,
    authorAvatarUrl: alice.avatarUrl,
    authorColor: alice.color,
    content: 'The green is a bit bright — maybe desaturate 10%? Touch targets look good size-wise.',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    x: 50,
    y: 58,
  },
];

export const metadata = {
  id: 'branch_mobile',
  name: 'mobile-first',
  description: 'Full-width stacked layout, hamburger nav, green CTA, social proof.',
  status: 'active' as const,
  color: '#10B981',
  collaborators: [alice, bob, clara],
  tags: ['responsive', 'mobile', 'ux'],
};
