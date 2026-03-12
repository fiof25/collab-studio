import type { Comment } from '@/types/branch';
import { clara } from '../collaborators';

export const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Pricing</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f5f3ef;color:#111;min-height:100vh}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2rem;background:#f5f3ef;border-bottom:1px solid #e8e4de}
    .logo{font-size:0.9375rem;font-weight:700;letter-spacing:-0.01em}
    nav ul{display:flex;gap:1.5rem;list-style:none}
    nav ul a{font-size:0.875rem;color:#78716c;text-decoration:none}
    .btn-sm{background:#111;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:500;cursor:pointer}
    .hero{text-align:center;padding:3rem 2rem 2rem}
    .eyebrow{font-size:0.6875rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a8a29e;margin-bottom:0.75rem}
    h1{font-size:2.25rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:0.75rem}
    .sub{font-size:0.9375rem;color:#78716c;max-width:400px;margin:0 auto 2.5rem;line-height:1.6}
    .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:0.875rem;max-width:860px;margin:0 auto;padding:0 2rem 3rem}
    .plan{background:#fff;border:1px solid #e8e4de;border-radius:14px;padding:1.375rem;display:flex;flex-direction:column}
    .plan.pop{border-color:#111;border-width:1.5px}
    .plan-label{font-size:0.625rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a8a29e;margin-bottom:0.625rem}
    .plan.pop .plan-label{color:#111}
    .plan-name{font-size:0.9375rem;font-weight:700;margin-bottom:0.25rem}
    .plan-price{font-size:1.875rem;font-weight:800;letter-spacing:-0.04em;line-height:1;margin-bottom:0.25rem}
    .plan-price sub{font-size:0.75rem;font-weight:400;color:#a8a29e;vertical-align:middle}
    .plan-tagline{font-size:0.75rem;color:#a8a29e;padding-bottom:1rem;margin-bottom:1rem;border-bottom:1px solid #f5f3ef}
    .feats{list-style:none;display:flex;flex-direction:column;gap:0.5rem;flex:1;margin-bottom:1.25rem}
    .feats li{font-size:0.75rem;color:#57534e;display:flex;gap:0.5rem;align-items:flex-start}
    .feats li::before{content:'–';color:#c8c4be;flex-shrink:0}
    .plan-btn{padding:0.625rem;border-radius:8px;font-size:0.8125rem;font-weight:600;cursor:pointer;border:none;width:100%}
    .plan-btn.ghost{background:transparent;border:1px solid #e8e4de;color:#57534e}
    .plan-btn.dark{background:#111;color:#fff}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <ul><li><a href="#">Product</a></li><li><a href="#">Pricing</a></li><li><a href="#">Docs</a></li></ul>
    <button class="btn-sm">Sign in</button>
  </nav>
  <section class="hero">
    <p class="eyebrow">Pricing</p>
    <h1>Simple,<br/>predictable pricing</h1>
    <p class="sub">Start free. No per-seat fees. No surprise invoices.</p>
  </section>
  <div class="plans">
    <div class="plan">
      <p class="plan-label">Starter</p>
      <p class="plan-name">Free</p>
      <p class="plan-price">$0<sub>/mo</sub></p>
      <p class="plan-tagline">For individuals & side projects</p>
      <ul class="feats">
        <li>3 active branches</li>
        <li>1 collaborator</li>
        <li>Community support</li>
      </ul>
      <button class="plan-btn ghost">Get started</button>
    </div>
    <div class="plan pop">
      <p class="plan-label">Most popular</p>
      <p class="plan-name">Pro</p>
      <p class="plan-price">$29<sub>/mo</sub></p>
      <p class="plan-tagline">For teams shipping fast</p>
      <ul class="feats">
        <li>Unlimited branches</li>
        <li>Up to 10 collaborators</li>
        <li>Priority support</li>
        <li>Custom domains</li>
      </ul>
      <button class="plan-btn dark">Start free trial</button>
    </div>
    <div class="plan">
      <p class="plan-label">Enterprise</p>
      <p class="plan-name">Custom</p>
      <p class="plan-price" style="font-size:1.25rem;padding:0.375rem 0">Let's talk</p>
      <p class="plan-tagline">For large orgs & compliance needs</p>
      <ul class="feats">
        <li>Unlimited everything</li>
        <li>SSO & SAML</li>
        <li>Dedicated SLA</li>
        <li>On-premise option</li>
      </ul>
      <button class="plan-btn ghost">Contact sales</button>
    </div>
  </div>
</body>
</html>`;

export const comments: Comment[] = [];

export const metadata = {
  id: 'branch_perf',
  name: 'perf-pass',
  description: 'Pricing page with 3-tier cards. Warm cream background, clean and structured.',
  status: 'active' as const,
  color: '#F59E0B',
  collaborators: [clara],
  tags: ['features', 'social-proof'],
};
