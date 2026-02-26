import type { ChatMessage } from '@/types/chat';

const now = Date.now();
const min = 1000 * 60;

export const mockThreads: Record<string, ChatMessage[]> = {
  branch_hero: [
    {
      id: 'msg_h1',
      branchId: 'branch_hero',
      role: 'user',
      content: 'Add a hero section with an animated gradient background and floating orbs',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 45,
    },
    {
      id: 'msg_h2',
      branchId: 'branch_hero',
      role: 'assistant',
      content:
        "Here's a hero section with a radial gradient glow and two floating orb elements animated with CSS keyframes. The heading uses a gradient clip for the accent word.",
      codeBlocks: [
        {
          language: 'css',
          filename: 'hero-styles.css',
          code: `.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 50% 30%,
    rgba(139,92,246,0.25) 0%,
    transparent 70%
  );
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-12px); }
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float 6s ease-in-out infinite;
}`,
        },
      ],
      status: 'done',
      timestamp: now - min * 44,
    },
    {
      id: 'msg_h3',
      branchId: 'branch_hero',
      role: 'user',
      content: 'Make the CTA buttons look more polished with a pill shape and gradient fill',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 30,
    },
    {
      id: 'msg_h4',
      branchId: 'branch_hero',
      role: 'assistant',
      content:
        'Updated both buttons. The primary uses a violet→cyan gradient with a 50px border-radius. The ghost button has a subtle white border and transparent fill.',
      codeBlocks: [
        {
          language: 'css',
          filename: 'buttons.css',
          code: `.btn-primary {
  background: linear-gradient(135deg, #8B5CF6, #06B6D4);
  color: #fff;
  padding: 0.9rem 2.2rem;
  border-radius: 50px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: #9898B0;
  padding: 0.9rem 2.2rem;
  border-radius: 50px;
  border: 1px solid rgba(255,255,255,0.12);
  cursor: pointer;
}`,
        },
      ],
      status: 'done',
      timestamp: now - min * 29,
    },
  ],

  branch_dark: [
    {
      id: 'msg_d1',
      branchId: 'branch_dark',
      role: 'user',
      content: 'Implement a dark theme using CSS custom properties',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 60,
    },
    {
      id: 'msg_d2',
      branchId: 'branch_dark',
      role: 'assistant',
      content:
        "Here's the full CSS variable system for the dark theme. I've structured it with a surface hierarchy (4 levels) and semantic tokens for text and borders.",
      codeBlocks: [
        {
          language: 'css',
          filename: 'theme.css',
          code: `:root {
  --bg:      #0D0D12;
  --surface: #14141C;
  --border:  #2E2E45;
  --text:    #F1F1F8;
  --muted:   #9898B0;
  --accent:  #8B5CF6;
}`,
        },
      ],
      status: 'done',
      timestamp: now - min * 59,
    },
    {
      id: 'msg_d3',
      branchId: 'branch_dark',
      role: 'user',
      content: 'Add a feature cards section below the hero',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 40,
    },
    {
      id: 'msg_d4',
      branchId: 'branch_dark',
      role: 'assistant',
      content:
        'Added a 3-column feature cards grid. Each card uses the surface color with a subtle border and hover lift effect.',
      codeBlocks: [
        {
          language: 'html',
          filename: 'features.html',
          code: `<section class="features">
  <div class="feature-card">
    <h3>Lightning Fast</h3>
    <p>Optimized for performance from day one.</p>
  </div>
  <div class="feature-card">
    <h3>Team Ready</h3>
    <p>Built for collaboration across any timezone.</p>
  </div>
  <div class="feature-card">
    <h3>Ship Daily</h3>
    <p>Deploy with confidence using our pipeline.</p>
  </div>
</section>`,
        },
      ],
      status: 'done',
      timestamp: now - min * 38,
    },
  ],

  branch_mobile: [
    {
      id: 'msg_m1',
      branchId: 'branch_mobile',
      role: 'user',
      content: 'Add responsive breakpoints and a mobile hamburger menu',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 20,
    },
    {
      id: 'msg_m2',
      branchId: 'branch_mobile',
      role: 'assistant',
      content:
        'Added a hamburger toggle for mobile nav. Below 768px, the nav links collapse into a slide-down drawer. I used a checkbox hack to keep it CSS-only.',
      codeBlocks: [
        {
          language: 'css',
          filename: 'responsive.css',
          code: `@media (max-width: 768px) {
  .hero h1 { font-size: 2.2rem; }
  .features { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .nav-links.open { display: flex; flex-direction: column; }
}`,
        },
      ],
      status: 'done',
      timestamp: now - min * 19,
    },
  ],

  branch_blend: [
    {
      id: 'msg_b1',
      branchId: 'branch_blend',
      role: 'user',
      content: 'Blend the dark theme and mobile-first branches together. Start with the dark mode base.',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 10,
    },
    {
      id: 'msg_b2',
      branchId: 'branch_blend',
      role: 'assistant',
      content:
        'Merging both branches. I\'ve applied the CSS variable system from dark-mode as the foundation, then layered the responsive grid and mobile nav from mobile-first on top. The result preserves the dark aesthetic while being fully responsive.',
      codeBlocks: [],
      status: 'done',
      timestamp: now - min * 9,
    },
  ],
};

export interface MockResponse {
  triggers: string[];
  text: string;
  code?: { language: string; filename: string; code: string };
}

export const mockResponses: MockResponse[] = [
  {
    triggers: ['hero', 'banner', 'header', 'landing'],
    text: "Here's a bold hero section with an animated gradient background and clear call-to-action.",
    code: {
      language: 'html',
      filename: 'hero.html',
      code: `<section class="hero">
  <h1>Build <span class="gradient-text">Something</span> Incredible</h1>
  <p>Ship faster. Collaborate better. Launch with confidence.</p>
  <div class="actions">
    <button class="btn-primary">Get started free</button>
    <button class="btn-ghost">See a demo →</button>
  </div>
</section>`,
    },
  },
  {
    triggers: ['dark', 'night', 'theme', 'color scheme'],
    text: "I'll apply a dark theme using CSS custom properties for easy theming across all components.",
    code: {
      language: 'css',
      filename: 'theme.css',
      code: `:root {
  --bg:      #0D0D12;
  --surface: #14141C;
  --border:  #2E2E45;
  --text:    #F1F1F8;
  --muted:   #9898B0;
  --accent:  #8B5CF6;
}

body {
  background: var(--bg);
  color: var(--text);
}`,
    },
  },
  {
    triggers: ['animation', 'animate', 'motion', 'transition'],
    text: "Adding smooth CSS animations. I've used keyframes for the main effect and a cubic-bezier easing for polish.",
    code: {
      language: 'css',
      filename: 'animations.css',
      code: `@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animated {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}`,
    },
  },
  {
    triggers: ['mobile', 'responsive', 'breakpoint', 'tablet'],
    text: "Here are the responsive styles. I've used a mobile-first approach with breakpoints at 640px, 768px, and 1024px.",
    code: {
      language: 'css',
      filename: 'responsive.css',
      code: `/* Mobile first base styles */
.hero h1 { font-size: 2rem; }
.features { grid-template-columns: 1fr; gap: 1rem; }

@media (min-width: 768px) {
  .hero h1 { font-size: 3rem; }
  .features { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .hero h1 { font-size: 4rem; }
  .features { grid-template-columns: repeat(3, 1fr); }
}`,
    },
  },
  {
    triggers: ['button', 'cta', 'call to action'],
    text: "Updated the CTA buttons with gradient fills and smooth hover transitions.",
    code: {
      language: 'css',
      filename: 'buttons.css',
      code: `.btn-primary {
  background: linear-gradient(135deg, #8B5CF6, #06B6D4);
  color: #fff;
  padding: 0.75rem 1.75rem;
  border-radius: 50px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}`,
    },
  },
  {
    triggers: ['card', 'feature', 'grid', 'section'],
    text: "Added a feature cards section with a 3-column grid and subtle hover effects.",
    code: {
      language: 'html',
      filename: 'features.html',
      code: `<section class="features">
  <div class="card">
    <div class="icon">⚡</div>
    <h3>Lightning Fast</h3>
    <p>Optimized for performance from day one.</p>
  </div>
  <div class="card">
    <div class="icon">🤝</div>
    <h3>Team Ready</h3>
    <p>Built for collaboration across any timezone.</p>
  </div>
  <div class="card">
    <div class="icon">🚀</div>
    <h3>Ship Daily</h3>
    <p>Deploy with confidence using our pipeline.</p>
  </div>
</section>`,
    },
  },
  {
    triggers: ['font', 'typography', 'text', 'heading'],
    text: "Updated the typography scale with Inter for body text and a tighter line-height for headings.",
    code: {
      language: 'css',
      filename: 'typography.css',
      code: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

body { font-family: 'Inter', sans-serif; line-height: 1.6; }
h1 { font-size: clamp(2rem, 5vw, 4.5rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; line-height: 1.2; }
p  { color: var(--muted, #9898B0); line-height: 1.75; }`,
    },
  },
];
