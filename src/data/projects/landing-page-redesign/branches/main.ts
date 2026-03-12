import type { Comment } from '@/types/branch';
import { alice, bob } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Build faster</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2rem;border-bottom:1px solid #e5e7eb}
    .logo{font-size:0.9375rem;font-weight:700;letter-spacing:-0.01em}
    nav ul{display:flex;gap:1.5rem;list-style:none}
    nav ul a{font-size:0.875rem;color:#6b7280;text-decoration:none}
    .btn{background:#111;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:500;cursor:pointer}
    .hero{max-width:580px;margin:0 auto;padding:5.5rem 2rem;text-align:center}
    h1{font-size:2.75rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:1rem}
    .sub{font-size:1.0625rem;color:#6b7280;margin-bottom:2rem;line-height:1.65}
    .cta-row{display:flex;gap:0.75rem;justify-content:center;align-items:center}
    .btn-lg{background:#111;color:#fff;border:none;padding:0.75rem 1.625rem;border-radius:7px;font-size:0.9375rem;font-weight:600;cursor:pointer}
    .btn-ghost{background:transparent;border:1px solid #d1d5db;color:#374151;padding:0.75rem 1.625rem;border-radius:7px;font-size:0.9375rem;cursor:pointer}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <ul><li><a href="#">Product</a></li><li><a href="#">Pricing</a></li><li><a href="#">Docs</a></li></ul>
    <button class="btn">Sign in</button>
  </nav>
  <section class="hero">
    <h1>Ship faster,<br/>together</h1>
    <p class="sub">The dev platform that keeps your team in sync — from first commit to production.</p>
    <div class="cta-row">
      <button class="btn-lg">Get started free</button>
      <button class="btn-ghost">See how it works</button>
    </div>
  </section>
</body>
</html>`;

export const comments: Comment[] = [
  {
    id: 'cmt_r1',
    branchId: 'branch_root',
    authorId: alice.id,
    authorName: alice.name,
    authorAvatarUrl: alice.avatarUrl,
    authorColor: alice.color,
    content: 'The spacing feels a bit tight on the hero — maybe bump the padding to 6rem and see if it breathes more?',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6,
    x: 48,
    y: 38,
  },
  {
    id: 'cmt_r2',
    branchId: 'branch_root',
    authorId: bob.id,
    authorName: bob.name,
    authorAvatarUrl: bob.avatarUrl,
    authorColor: bob.color,
    content: 'Nav links could be a touch lighter — #9ca3af feels more refined than the current grey.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
    x: 62,
    y: 5,
  },
];

export const metadata = {
  id: 'branch_root',
  name: 'main',
  description: 'Clean minimal baseline — white bg, centered hero, black CTA button.',
  status: 'active' as const,
  color: '#8B5CF6',
  collaborators: [alice, bob],
  tags: ['baseline', 'production'],
};
