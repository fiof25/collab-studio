import type { Branch, Collaborator, Comment, Project } from '@/types/branch';

const now = Date.now();
const day = 1000 * 60 * 60 * 24;
const hour = 1000 * 60 * 60;

const alice: Collaborator = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
  color: '#8B5CF6',
};

const bob: Collaborator = {
  id: 'user_bob',
  name: 'Bob Tran',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
  color: '#06B6D4',
};

const clara: Collaborator = {
  id: 'user_clara',
  name: 'Clara Sun',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
  color: '#EC4899',
};

// 1. Main: minimal centered, white bg, black CTA
const rootCode = `<!DOCTYPE html>
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

// 2. Hero redesign: two-column, left text + right product mockup, blue accent
const heroCode = `<!DOCTYPE html>
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

// 3. Dark mode: dark navy bg, white text, feature cards below hero
const darkCode = `<!DOCTYPE html>
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

// 4. Mobile-first: large stacked layout, hamburger nav, big touch targets, green CTA
const mobileCode = `<!DOCTYPE html>
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

// 5. Perf pass: hero + logo bar + 3-column feature grid, cleaner/lighter
const perfCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Forge — Features</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
    nav{display:flex;justify-content:space-between;align-items:center;padding:1.125rem 2.5rem;border-bottom:1px solid #e5e7eb}
    .logo{font-size:0.9375rem;font-weight:700}
    .nav-c{display:flex;gap:1.5rem}
    .nav-c a{font-size:0.875rem;color:#6b7280;text-decoration:none}
    .nav-r{display:flex;gap:0.75rem;align-items:center}
    .btn-sm{font-size:0.875rem;color:#6b7280;background:none;border:none;cursor:pointer}
    .btn{background:#111;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.875rem;font-weight:500;cursor:pointer}
    .hero{text-align:center;padding:4.5rem 2rem 3rem;max-width:640px;margin:0 auto}
    h1{font-size:2.625rem;font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:0.875rem}
    .sub{font-size:1rem;color:#6b7280;margin-bottom:1.75rem;line-height:1.65}
    .cta-row{display:flex;gap:0.625rem;justify-content:center}
    .btn-lg{background:#111;color:#fff;border:none;padding:0.7rem 1.5rem;border-radius:7px;font-size:0.9375rem;font-weight:600;cursor:pointer}
    .btn-outline{background:transparent;border:1px solid #d1d5db;color:#374151;padding:0.7rem 1.5rem;border-radius:7px;font-size:0.9375rem;cursor:pointer}
    .logos{border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:center;gap:2rem}
    .logos span{font-size:0.8125rem;font-weight:600;color:#9ca3af;letter-spacing:0.05em;text-transform:uppercase}
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;max-width:1000px;margin:3rem auto;padding:0 2.5rem 4rem}
    .feat{padding:1.5rem;border:1px solid #e5e7eb;border-radius:12px}
    .feat-icon{width:36px;height:36px;background:#f3f4f6;border-radius:8px;margin-bottom:1rem;display:flex;align-items:center;justify-content:center;font-size:1rem}
    .feat h3{font-size:0.9375rem;font-weight:600;margin-bottom:0.5rem}
    .feat p{font-size:0.875rem;color:#6b7280;line-height:1.6}
  </style>
</head>
<body>
  <nav>
    <span class="logo">Forge</span>
    <div class="nav-c"><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a><a href="#">Blog</a></div>
    <div class="nav-r"><button class="btn-sm">Sign in</button><button class="btn">Get started</button></div>
  </nav>
  <section class="hero">
    <h1>Ship faster,<br/>together</h1>
    <p class="sub">One platform for your entire development lifecycle. From idea to production in record time.</p>
    <div class="cta-row">
      <button class="btn-lg">Get started free</button>
      <button class="btn-outline">View demo</button>
    </div>
  </section>
  <div class="logos">
    <span>Stripe</span><span>Vercel</span><span>Linear</span><span>Figma</span><span>Notion</span>
  </div>
  <div class="features">
    <div class="feat"><div class="feat-icon">⚡</div><h3>Instant deploys</h3><p>Push to any environment in seconds. Zero downtime, every time.</p></div>
    <div class="feat"><div class="feat-icon">👥</div><h3>Team collaboration</h3><p>Real-time presence, live reviews, and async comment threads.</p></div>
    <div class="feat"><div class="feat-icon">📊</div><h3>Analytics built in</h3><p>Core Web Vitals, error tracking, and usage insights out of the box.</p></div>
    <div class="feat"><div class="feat-icon">🔒</div><h3>Enterprise security</h3><p>SOC 2 Type II, SAML SSO, and audit logs for every action.</p></div>
    <div class="feat"><div class="feat-icon">🔧</div><h3>Zero config</h3><p>Connect your repo and deploy. No Dockerfiles, no YAML.</p></div>
    <div class="feat"><div class="feat-icon">🌐</div><h3>Global edge</h3><p>30+ regions worldwide. Your users get sub-50ms latency.</p></div>
  </div>
</body>
</html>`;

// 6. Dark mobile blend: dark + full features + single column mobile layout
const blendCode = `<!DOCTYPE html>
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

const rootComments: Comment[] = [
  {
    id: 'cmt_r1',
    branchId: 'branch_root',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'This is our baseline — please branch off from here before making any changes!',
    timestamp: now - day * 6,
  },
  {
    id: 'cmt_r2',
    branchId: 'branch_root',
    authorId: 'user_bob',
    authorName: 'Bob Tran',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
    authorColor: '#06B6D4',
    content: "The nav font should be Inter 700, not system-ui. I'll fix that in my branch.",
    timestamp: now - day * 5,
  },
];

const heroComments: Comment[] = [
  {
    id: 'cmt_h1',
    branchId: 'branch_hero',
    authorId: 'user_clara',
    authorName: 'Clara Sun',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
    authorColor: '#EC4899',
    content: 'Love the two-column layout! The product mockup on the right really helps visualise the value.',
    timestamp: now - day * 4,
  },
  {
    id: 'cmt_h2',
    branchId: 'branch_hero',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: "The blue CTA reads much better than black. Let's keep this direction.",
    timestamp: now - day * 3,
  },
];

const darkComments: Comment[] = [
  {
    id: 'cmt_d1',
    branchId: 'branch_dark',
    authorId: 'user_bob',
    authorName: 'Bob Tran',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
    authorColor: '#06B6D4',
    content: 'Dark theme is looking clean. CSS variable approach makes it easy to tweak later.',
    timestamp: now - day * 3,
  },
  {
    id: 'cmt_d2',
    branchId: 'branch_dark',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'The feature cards are a great addition. Maybe add a subtle hover animation?',
    timestamp: now - day * 2,
  },
];

const mobileComments: Comment[] = [
  {
    id: 'cmt_m1',
    branchId: 'branch_mobile',
    authorId: 'user_clara',
    authorName: 'Clara Sun',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
    authorColor: '#EC4899',
    content: "Tested on iPhone 15 — looks great! The stacked layout works perfectly on small screens.",
    timestamp: now - hour * 6,
  },
  {
    id: 'cmt_m2',
    branchId: 'branch_mobile',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'The green CTA pops nicely. Social proof section is a good trust signal.',
    timestamp: now - hour * 2,
  },
];

const blendComments: Comment[] = [
  {
    id: 'cmt_b1',
    branchId: 'branch_blend',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'Dark + mobile is really slick. The card list layout feels very native.',
    timestamp: now - hour * 1,
  },
];

export const branches: Branch[] = [
  {
    id: 'branch_root',
    name: 'main',
    description: 'Clean minimal baseline — white bg, centered hero, black CTA button.',
    parentId: null,
    status: 'active',
    color: '#8B5CF6',
    createdAt: now - day * 7,
    updatedAt: now - hour * 2,
    collaborators: [alice, bob],
    tags: ['baseline', 'production'],
    position: { x: 440, y: 100 },
    checkpoints: [
      {
        id: 'ckpt_r1',
        branchId: 'branch_root',
        label: 'Initial scaffold',
        timestamp: now - day * 7,
        thumbnailUrl: '',
        codeSnapshot: rootCode,
      },
    ],
    comments: rootComments,
  },
  {
    id: 'branch_hero',
    name: 'hero-redesign',
    description: 'Two-column layout with product mockup on right and a blue CTA.',
    parentId: 'branch_root',
    status: 'active',
    color: '#06B6D4',
    createdAt: now - day * 5,
    updatedAt: now - hour * 1,
    collaborators: [alice, clara],
    tags: ['ui', 'two-column', 'hero'],
    position: { x: 180, y: 420 },
    checkpoints: [
      {
        id: 'ckpt_h1',
        branchId: 'branch_hero',
        label: 'Two-column hero layout',
        timestamp: now - day * 5,
        thumbnailUrl: '',
        codeSnapshot: heroCode,
      },
    ],
    comments: heroComments,
  },
  {
    id: 'branch_dark',
    name: 'dark-mode',
    description: 'Dark navy background, white text, sticky nav, feature cards section.',
    parentId: 'branch_root',
    status: 'active',
    color: '#A855F7',
    createdAt: now - day * 4,
    updatedAt: now - hour * 3,
    collaborators: [bob],
    tags: ['dark-theme', 'accessibility'],
    position: { x: 700, y: 420 },
    checkpoints: [
      {
        id: 'ckpt_d1',
        branchId: 'branch_dark',
        label: 'Dark palette + sticky nav',
        timestamp: now - day * 4,
        thumbnailUrl: '',
        codeSnapshot: darkCode,
      },
    ],
    comments: darkComments,
  },
  {
    id: 'branch_mobile',
    name: 'mobile-first',
    description: 'Full-width stacked layout, hamburger nav, green CTA, social proof.',
    parentId: 'branch_hero',
    status: 'active',
    color: '#10B981',
    createdAt: now - day * 3,
    updatedAt: now - hour * 0.5,
    collaborators: [alice, bob, clara],
    tags: ['responsive', 'mobile', 'ux'],
    position: { x: 0, y: 760 },
    checkpoints: [
      {
        id: 'ckpt_m1',
        branchId: 'branch_mobile',
        label: 'Mobile stacked layout',
        timestamp: now - day * 3,
        thumbnailUrl: '',
        codeSnapshot: mobileCode,
      },
    ],
    comments: mobileComments,
  },
  {
    id: 'branch_perf',
    name: 'perf-pass',
    description: 'Hero + logo bar + 6-card feature grid. More content, richer layout.',
    parentId: 'branch_hero',
    status: 'active',
    color: '#F59E0B',
    createdAt: now - day * 3,
    updatedAt: now - day * 1,
    collaborators: [clara],
    tags: ['features', 'social-proof'],
    position: { x: 360, y: 760 },
    checkpoints: [
      {
        id: 'ckpt_p1',
        branchId: 'branch_perf',
        label: 'Logo bar + feature grid',
        timestamp: now - day * 3,
        thumbnailUrl: '',
        codeSnapshot: perfCode,
      },
    ],
    comments: [],
  },
  {
    id: 'branch_blend',
    name: 'dark-mobile-blend',
    description: 'Dark theme meets mobile-first — card list layout on dark zinc background.',
    parentId: 'branch_dark',
    status: 'merged',
    color: '#EC4899',
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.25,
    collaborators: [alice, bob],
    tags: ['blend', 'dark-theme', 'mobile'],
    position: { x: 700, y: 760 },
    checkpoints: [
      {
        id: 'ckpt_b1',
        branchId: 'branch_blend',
        label: 'Dark mobile card layout',
        timestamp: now - day * 1,
        thumbnailUrl: '',
        codeSnapshot: blendCode,
      },
    ],
    comments: blendComments,
  },
];

export const mockProject: Project = {
  id: 'proj_01',
  name: 'Landing Page Redesign',
  description: 'Collaborative redesign of the main product landing page.',
  createdAt: now - day * 7,
  updatedAt: now - hour * 0.25,
  rootBranchId: 'branch_root',
  branches,
};
