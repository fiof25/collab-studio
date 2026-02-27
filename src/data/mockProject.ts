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

const rootCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Product Landing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
    nav { padding: 1rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    nav .logo { font-weight: 700; font-size: 1.2rem; }
    nav .cta { background: #111; color: #fff; padding: 0.5rem 1.2rem; border-radius: 6px; font-size: 0.9rem; }
    .hero { padding: 6rem 2rem; text-align: center; }
    .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; color: #555; max-width: 480px; margin: 0 auto 2rem; }
    .hero .btn { background: #111; color: #fff; padding: 0.8rem 2rem; border-radius: 8px; font-size: 1rem; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Launchpad</span>
    <button class="cta">Get Started</button>
  </nav>
  <section class="hero">
    <h1>Build Something Incredible</h1>
    <p>The fastest way to take your idea from zero to shipped. No fluff, just results.</p>
    <button class="btn">Start for free</button>
  </section>
</body>
</html>`;

const heroCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Product Landing - Hero Redesign</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #fff; overflow-x: hidden; }
    nav { padding: 1.2rem 2.5rem; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; }
    nav .logo { font-weight: 800; font-size: 1.3rem; background: linear-gradient(135deg, #8B5CF6, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    nav .cta { background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: #fff; padding: 0.6rem 1.4rem; border-radius: 50px; font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer; }
    .hero { min-height: 90vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 2rem; position: relative; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(139,92,246,0.25) 0%, transparent 70%); pointer-events: none; }
    .hero h1 { font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1.5rem; }
    .hero h1 span { background: linear-gradient(135deg, #8B5CF6, #06B6D4 50%, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 1.2rem; color: #9898B0; max-width: 500px; margin: 0 auto 2.5rem; line-height: 1.7; }
    .hero .actions { display: flex; gap: 1rem; justify-content: center; }
    .hero .btn-primary { background: linear-gradient(135deg, #8B5CF6, #06B6D4); color: #fff; padding: 0.9rem 2.2rem; border-radius: 50px; font-size: 1rem; font-weight: 700; border: none; cursor: pointer; }
    .hero .btn-ghost { background: transparent; color: #9898B0; padding: 0.9rem 2.2rem; border-radius: 50px; font-size: 1rem; border: 1px solid rgba(255,255,255,0.12); cursor: pointer; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    .orb { position: absolute; border-radius: 50%; filter: blur(80px); animation: float 6s ease-in-out infinite; pointer-events: none; }
    .orb1 { width: 400px; height: 400px; background: rgba(139,92,246,0.15); top: -100px; right: -100px; }
    .orb2 { width: 300px; height: 300px; background: rgba(6,182,212,0.12); bottom: 0; left: -80px; animation-delay: -3s; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Launchpad</span>
    <button class="cta">Get Started Free</button>
  </nav>
  <section class="hero">
    <div class="orb orb1"></div>
    <div class="orb orb2"></div>
    <h1>Build <span>Something</span><br/>Incredible</h1>
    <p>The fastest way to take your idea from zero to shipped. Beautiful, powerful, and ridiculously fast.</p>
    <div class="actions">
      <button class="btn-primary">Start for free</button>
      <button class="btn-ghost">See demo →</button>
    </div>
  </section>
</body>
</html>`;

const darkCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Product Landing - Dark Theme</title>
  <style>
    :root { --bg: #0D0D12; --surface: #14141C; --border: #2E2E45; --text: #F1F1F8; --muted: #9898B0; --accent: #8B5CF6; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }
    nav { padding: 1.2rem 2.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: rgba(13,13,18,0.9); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 10; }
    nav .logo { font-weight: 800; font-size: 1.2rem; color: var(--text); }
    nav .cta { background: var(--accent); color: #fff; padding: 0.5rem 1.2rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer; }
    .hero { padding: 6rem 2rem; text-align: center; }
    .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1rem; }
    .hero p { font-size: 1.1rem; color: var(--muted); max-width: 480px; margin: 0 auto 2rem; }
    .hero .btn { background: var(--accent); color: #fff; padding: 0.8rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 600; border: none; cursor: pointer; }
    .features { padding: 4rem 2rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 900px; margin: 0 auto; }
    .feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
    .feature-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .feature-card p { font-size: 0.9rem; color: var(--muted); }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Launchpad</span>
    <button class="cta">Get Started</button>
  </nav>
  <section class="hero">
    <h1>Build Something Incredible</h1>
    <p>The fastest way to take your idea from zero to shipped. Designed for the dark hours.</p>
    <button class="btn">Start for free</button>
  </section>
  <section class="features">
    <div class="feature-card"><h3>Lightning Fast</h3><p>Optimized for performance from day one.</p></div>
    <div class="feature-card"><h3>Team Ready</h3><p>Built for collaboration across any timezone.</p></div>
    <div class="feature-card"><h3>Ship Daily</h3><p>Deploy with confidence using our CI/CD pipeline.</p></div>
  </section>
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
    content: 'The nav font should be Inter 700, not system-ui. I\'ll fix that in my branch.',
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
    content: 'Love the floating orbs! Can we make them a bit more subtle? Maybe 10% opacity instead of 15%?',
    timestamp: now - day * 4,
  },
  {
    id: 'cmt_h2',
    branchId: 'branch_hero',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'The gradient text on the heading is perfect. Let\'s blend this with the dark mode version!',
    timestamp: now - day * 3,
  },
  {
    id: 'cmt_h3',
    branchId: 'branch_hero',
    authorId: 'user_bob',
    authorName: 'Bob Tran',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
    authorColor: '#06B6D4',
    content: 'CTA button looks great on desktop but we need to test on mobile too.',
    timestamp: now - hour * 8,
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
    content: 'Dark theme is looking clean. The CSS variable approach makes it easy to tweak later.',
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
    content: 'Tested on iPhone 15 — looks great! The hamburger menu works perfectly.',
    timestamp: now - hour * 6,
  },
  {
    id: 'cmt_m2',
    branchId: 'branch_mobile',
    authorId: 'user_alice',
    authorName: 'Alice Kim',
    authorAvatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
    authorColor: '#8B5CF6',
    content: 'Can we increase the touch target size on the nav links? At least 44px height.',
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
    content: 'This blend is coming together nicely! Dark theme + responsive = the final version.',
    timestamp: now - hour * 1,
  },
];

export const branches: Branch[] = [
  {
    id: 'branch_root',
    name: 'main',
    description: 'Original landing page skeleton — the canonical starting point for all branches.',
    parentId: null,
    status: 'active',
    color: '#8B5CF6',
    createdAt: now - day * 7,
    updatedAt: now - hour * 2,
    collaborators: [alice, bob],
    tags: ['baseline', 'production'],
    position: { x: 400, y: 60 },
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
    description: 'Animated gradient hero with floating orbs, glassmorphism nav, and gradient typography.',
    parentId: 'branch_root',
    status: 'active',
    color: '#06B6D4',
    createdAt: now - day * 5,
    updatedAt: now - hour * 1,
    collaborators: [alice, clara],
    tags: ['ui', 'animation', 'hero'],
    position: { x: 160, y: 300 },
    checkpoints: [
      {
        id: 'ckpt_h1',
        branchId: 'branch_hero',
        label: 'Add gradient hero layout',
        timestamp: now - day * 5,
        thumbnailUrl: '',
        codeSnapshot: heroCode,
      },
      {
        id: 'ckpt_h2',
        branchId: 'branch_hero',
        label: 'Add floating orb animations',
        timestamp: now - day * 4,
        thumbnailUrl: '',
        codeSnapshot: heroCode,
      },
    ],
    comments: heroComments,
  },
  {
    id: 'branch_dark',
    name: 'dark-mode',
    description: 'Full dark theme implementation with CSS custom properties and sticky nav.',
    parentId: 'branch_root',
    status: 'active',
    color: '#A855F7',
    createdAt: now - day * 4,
    updatedAt: now - hour * 3,
    collaborators: [bob],
    tags: ['dark-theme', 'accessibility'],
    position: { x: 640, y: 300 },
    checkpoints: [
      {
        id: 'ckpt_d1',
        branchId: 'branch_dark',
        label: 'CSS variables dark palette',
        timestamp: now - day * 4,
        thumbnailUrl: '',
        codeSnapshot: darkCode,
      },
      {
        id: 'ckpt_d2',
        branchId: 'branch_dark',
        label: 'Sticky nav with blur',
        timestamp: now - day * 3,
        thumbnailUrl: '',
        codeSnapshot: darkCode,
      },
      {
        id: 'ckpt_d3',
        branchId: 'branch_dark',
        label: 'Feature cards section',
        timestamp: now - day * 2,
        thumbnailUrl: '',
        codeSnapshot: darkCode,
      },
    ],
    comments: darkComments,
  },
  {
    id: 'branch_mobile',
    name: 'mobile-first',
    description: 'Responsive breakpoints, mobile navigation drawer, and touch-optimized interactions.',
    parentId: 'branch_hero',
    status: 'active',
    color: '#10B981',
    createdAt: now - day * 3,
    updatedAt: now - hour * 0.5,
    collaborators: [alice, bob, clara],
    tags: ['responsive', 'mobile', 'ux'],
    position: { x: 60, y: 540 },
    checkpoints: [
      {
        id: 'ckpt_m1',
        branchId: 'branch_mobile',
        label: 'Mobile nav drawer',
        timestamp: now - day * 3,
        thumbnailUrl: '',
        codeSnapshot: heroCode,
      },
    ],
    comments: mobileComments,
  },
  {
    id: 'branch_perf',
    name: 'perf-pass',
    description: 'Lazy loading, image optimization, and Core Web Vitals improvements.',
    parentId: 'branch_hero',
    status: 'active',
    color: '#F59E0B',
    createdAt: now - day * 3,
    updatedAt: now - day * 1,
    collaborators: [clara],
    tags: ['performance', 'cwv'],
    position: { x: 310, y: 540 },
    checkpoints: [
      {
        id: 'ckpt_p1',
        branchId: 'branch_perf',
        label: 'Lazy load images',
        timestamp: now - day * 3,
        thumbnailUrl: '',
        codeSnapshot: heroCode,
      },
    ],
    comments: [],
  },
  {
    id: 'branch_blend',
    name: 'dark-mobile-blend',
    description: 'Blended with dark-mode — dark theme and mobile-first layout combined.',
    parentId: 'branch_dark',
    status: 'merged',
    color: '#EC4899',
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.25,
    collaborators: [alice, bob],
    tags: ['blend', 'dark-theme', 'mobile'],
    position: { x: 580, y: 540 },
    checkpoints: [
      {
        id: 'ckpt_b1',
        branchId: 'branch_blend',
        label: 'Initial blend snapshot',
        timestamp: now - day * 1,
        thumbnailUrl: '',
        codeSnapshot: darkCode,
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
