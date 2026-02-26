import { useNavigate } from 'react-router-dom';
import { GitBranch, Camera, Plus, ChevronRight, Sun, Moon } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useUIStore } from '@/store/useUIStore';
import { Avatar, AvatarGroup } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Collaborator } from '@/types/branch';

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = Date.now();
const hour = 1000 * 60 * 60;
const day = hour * 24;

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
const dan: Collaborator = {
  id: 'user_dan',
  name: 'Dan Park',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=dan&backgroundColor=d1d4f9',
  color: '#F59E0B',
};

const mobilePreview = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,sans-serif}body{background:#0a0a14;color:#fff;display:flex;justify-content:center;align-items:flex-start;padding:20px}.phone{background:#111;border-radius:28px;width:200px;overflow:hidden;border:2.5px solid #2a2a40}.status{background:#000;padding:12px 16px 4px;display:flex;justify-content:space-between;font-size:10px;color:#666}.header{padding:12px 16px;border-bottom:1px solid #222;display:flex;align-items:center;justify-content:space-between}.header h1{font-size:15px;font-weight:700}.body{padding:12px;display:flex;flex-direction:column;gap:8px}.card{background:#161628;border-radius:12px;padding:12px;border:1px solid #2a2a40}.card h3{font-size:11px;font-weight:600;margin-bottom:4px}.card p{font-size:9px;color:#888}.pill{display:inline-block;background:#2d2060;color:#8B5CF6;font-size:8px;padding:2px 7px;border-radius:20px;margin-top:5px}.dot{width:6px;height:6px;border-radius:50%;background:#10B981}</style></head><body><div class="phone"><div class="status"><span>9:41</span><span>●●●</span></div><div class="header"><h1>Dashboard</h1><div class="dot"></div></div><div class="body"><div class="card"><h3>Monthly Revenue</h3><p>$24,502 — up this month</p><span class="pill">+12% ↑</span></div><div class="card"><h3>Active Users</h3><p>1,204 users online today</p><span class="pill">+5% ↑</span></div><div class="card"><h3>Conversion</h3><p>3.8% from landing page</p><span class="pill">stable →</span></div></div></div></body></html>`;

const dashPreview = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,sans-serif}body{background:#f6f6fc;color:#111;display:flex}.sidebar{width:160px;background:#fff;border-right:1px solid #e8e8f0;padding:16px 10px;flex-shrink:0}.sidebar .logo{font-size:12px;font-weight:800;color:#7c3aed;margin-bottom:16px}.nav-item{padding:7px 10px;border-radius:7px;font-size:11px;color:#666;margin-bottom:2px}.nav-item.active{background:#f3f0ff;color:#7c3aed;font-weight:600}.main{flex:1;padding:20px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.stat{background:#fff;border:1px solid #e8e8f0;border-radius:10px;padding:12px}.stat .num{font-size:20px;font-weight:800}.stat .label{font-size:9px;color:#999;margin-top:2px}.chart{background:#fff;border:1px solid #e8e8f0;border-radius:10px;padding:12px;height:90px;display:flex;align-items:flex-end;gap:5px}.bar{flex:1;background:#7c3aed;border-radius:3px 3px 0 0;opacity:.7}</style></head><body><div class="sidebar"><div class="logo">Analytics</div><div class="nav-item active">Overview</div><div class="nav-item">Revenue</div><div class="nav-item">Users</div><div class="nav-item">Reports</div></div><div class="main"><div class="stats"><div class="stat"><div class="num">$48k</div><div class="label">Revenue</div></div><div class="stat"><div class="num">2.4k</div><div class="label">Users</div></div><div class="stat"><div class="num">12%</div><div class="label">Growth</div></div></div><div class="chart"><div class="bar" style="height:40%"></div><div class="bar" style="height:65%"></div><div class="bar" style="height:52%"></div><div class="bar" style="height:80%"></div><div class="bar" style="height:68%"></div><div class="bar" style="height:90%"></div><div class="bar" style="height:74%"></div></div></div></body></html>`;

const marketingPreview = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,sans-serif}body{background:#fff;color:#111}nav{padding:14px 24px;border-bottom:1px solid #f0f0f8;display:flex;justify-content:space-between;align-items:center}nav .logo{font-weight:800;font-size:14px;color:#7c3aed}nav .links{display:flex;gap:14px;font-size:11px;color:#999}.hero{padding:52px 24px 36px;text-align:center;background:linear-gradient(180deg,#f9f7ff 0%,#fff 100%)}.hero h1{font-size:30px;font-weight:900;margin-bottom:10px;line-height:1.2}.hero h1 em{font-style:normal;color:#7c3aed}.hero p{font-size:12px;color:#888;max-width:300px;margin:0 auto 18px;line-height:1.6}.cta{display:inline-block;background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;font-size:12px;font-weight:600}.logos{display:flex;justify-content:center;gap:20px;padding:18px;border-top:1px solid #f0f0f8}.logo-item{font-size:9px;font-weight:800;color:#ddd;letter-spacing:.08em}</style></head><body><nav><span class="logo">Nexus</span><div class="links"><span>Product</span><span>Pricing</span><span>Blog</span></div></nav><section class="hero"><h1>Grow <em>faster</em><br/>with Nexus</h1><p>The all-in-one growth platform for teams that ship.</p><span class="cta">Start free trial</span></section><div class="logos"><span class="logo-item">STRIPE</span><span class="logo-item">LINEAR</span><span class="logo-item">VERCEL</span><span class="logo-item">NOTION</span></div></body></html>`;

interface HomeProject {
  id: string;
  name: string;
  description: string;
  branchCount: number;
  snapshotCount: number;
  collaborators: Collaborator[];
  updatedAt: number;
  accentColor: string;
  preview: string;
  isReal: boolean;
}

const MOCK_PROJECTS: HomeProject[] = [
  {
    id: 'proj_01',
    name: 'Landing Page Redesign',
    description: 'Collaborative redesign of the main product landing page.',
    branchCount: 6,
    snapshotCount: 9,
    collaborators: [alice, bob, clara],
    updatedAt: now - hour * 0.25,
    accentColor: '#8B5CF6',
    preview: '',
    isReal: true,
  },
  {
    id: 'proj_02',
    name: 'Mobile App Prototype',
    description: 'iOS-first mobile dashboard with dark theme and native interactions.',
    branchCount: 4,
    snapshotCount: 11,
    collaborators: [alice, dan],
    updatedAt: now - hour * 3,
    accentColor: '#06B6D4',
    preview: mobilePreview,
    isReal: false,
  },
  {
    id: 'proj_03',
    name: 'Analytics Dashboard',
    description: 'Internal dashboard for tracking KPIs and user metrics.',
    branchCount: 3,
    snapshotCount: 6,
    collaborators: [bob, clara],
    updatedAt: now - day * 1,
    accentColor: '#10B981',
    preview: dashPreview,
    isReal: false,
  },
  {
    id: 'proj_04',
    name: 'Marketing Site',
    description: 'Public-facing marketing site for Nexus — new brand direction.',
    branchCount: 5,
    snapshotCount: 14,
    collaborators: [clara, alice, dan],
    updatedAt: now - day * 2,
    accentColor: '#EC4899',
    preview: marketingPreview,
    isReal: false,
  },
];

interface ActivityItem {
  id: string;
  actor: Collaborator;
  verb: string;
  target: string;
  targetColor: string;
  timestamp: number;
}

const ACTIVITIES: ActivityItem[] = [
  { id: 'a1', actor: alice, verb: 'saved a version on', target: 'hero-redesign', targetColor: '#06B6D4', timestamp: now - hour * 0.5 },
  { id: 'a2', actor: bob, verb: 'branched off from', target: 'dark-mode', targetColor: '#A855F7', timestamp: now - hour * 5 },
  { id: 'a3', actor: clara, verb: 'commented on', target: 'mobile-first', targetColor: '#10B981', timestamp: now - hour * 6 },
  { id: 'a4', actor: alice, verb: 'blended', target: 'dark-mode + mobile-first', targetColor: '#EC4899', timestamp: now - day * 1 },
  { id: 'a5', actor: dan, verb: 'joined', target: 'Landing Page Redesign', targetColor: '#8B5CF6', timestamp: now - day * 1.5 },
  { id: 'a6', actor: bob, verb: 'saved a version on', target: 'perf-pass', targetColor: '#F59E0B', timestamp: now - day * 2 },
];

// ─── Contribution data (GitHub-style grid) ────────────────────────────────────

const GRID_WEEKS = 26;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// [week][day] — week 0 is oldest, day 0 is Monday
const CONTRIB_GRID: number[][] = Array.from({ length: GRID_WEEKS }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const isWeekend = d >= 5;
    const recency = w / GRID_WEEKS;
    const r = seededRand(w * 7 + d);
    if (isWeekend) return r < 0.18 ? 1 : 0;
    const adj = r * (0.35 + recency * 0.65);
    return adj < 0.08 ? 0 : adj < 0.28 ? 1 : adj < 0.52 ? 2 : adj < 0.74 ? 3 : 4;
  })
);

const TOTAL_CONTRIBS = CONTRIB_GRID.flat().filter(v => v > 0).length;

function getMonthLabels(weeks: number): string[] {
  const labels: string[] = new Array(weeks).fill('');
  const today = new Date();
  let lastMonth = -1;
  for (let i = 0; i < weeks; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    const m = d.getMonth();
    if (m !== lastMonth) { labels[i] = d.toLocaleString('default', { month: 'short' }); lastMonth = m; }
  }
  return labels;
}

const MONTH_LABELS = getMonthLabels(GRID_WEEKS);

// ─── Constants for iframe scaling ─────────────────────────────────────────────

const CARD_SCALE = 0.28;
const CARD_IFRAME_W = 960;
const CARD_PREVIEW_H = 130;
const CARD_IFRAME_H = Math.ceil(CARD_PREVIEW_H / CARD_SCALE);

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  realPreview,
}: {
  project: HomeProject;
  realPreview: string;
}) {
  const navigate = useNavigate();
  const preview = project.isReal ? realPreview : project.preview;

  return (
    <div
      className="rounded-xl overflow-hidden border border-line bg-surface-1 cursor-pointer group hover:border-line-accent transition-all duration-150"
      onClick={() => project.isReal && navigate('/project')}
    >
      {/* Accent line */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: project.accentColor }} />

      {/* Preview */}
      <div className="overflow-hidden bg-white flex-shrink-0" style={{ height: CARD_PREVIEW_H }}>
        {preview ? (
          <iframe
            srcDoc={preview}
            title={project.name}
            sandbox="allow-scripts"
            style={{
              width: CARD_IFRAME_W,
              height: CARD_IFRAME_H,
              transform: `scale(${CARD_SCALE})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div className="w-full h-full bg-surface-2 flex items-center justify-center">
            <Camera size={20} className="text-ink-muted" />
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-primary truncate">
            {project.name}
          </span>
          <ChevronRight
            size={12}
            className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-2xs text-ink-muted">
            <span className="flex items-center gap-1">
              <GitBranch size={9} />
              {project.branchCount}
            </span>
            <span className="flex items-center gap-1">
              <Camera size={9} />
              {project.snapshotCount}
            </span>
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </div>
          <AvatarGroup collaborators={project.collaborators} max={3} size="xs" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  const { theme, toggle } = useThemeStore();
  const { toggleTeamPanel } = useUIStore();
  const realPreview =
    project?.branches.find((b) => !b.parentId)?.checkpoints[0]?.codeSnapshot ?? '';

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-5 border-b border-line bg-surface-1/80 backdrop-blur-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-accent-violet flex items-center justify-center">
            <GitBranch size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-ink-primary">Collab Studio</span>
        </div>

        <nav className="flex items-center gap-0.5 text-xs">
          <button className="px-3 py-1.5 rounded-lg text-ink-primary font-medium bg-surface-2">
            Projects
          </button>
          <button className="px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors">
            Activity
          </button>
          <button
            onClick={toggleTeamPanel}
            className="px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
          >
            Team
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Avatar collaborator={alice} size="sm" />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-6 grid grid-cols-[240px_1fr] gap-8 items-start">

          {/* ── Left Sidebar ── */}
          <aside className="flex flex-col gap-5 sticky top-0">
            {/* Profile */}
            <div className="flex flex-col gap-3">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-surface-3 ring-2 ring-line flex-shrink-0">
                <img
                  src="/catpfp.jpg"
                  alt="Alice Kim"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-primary">Alice Kim</h2>
                <p className="text-xs font-mono text-ink-muted">@alice</p>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Design lead · building collaborative tools for creative teams
              </p>
            </div>

            {/* Stats */}
            <div className="border-t border-line pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: 'Projects', value: '4' },
                { label: 'Branches', value: '24' },
                { label: 'Versions', value: '18' },
                { label: 'Comments', value: '36' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-sm font-bold text-ink-primary">{value}</div>
                  <div className="text-2xs text-ink-muted mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Online now */}
            <div className="border-t border-line pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse-slow" />
                <span className="text-2xs font-medium text-ink-muted">Online now</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {[alice, bob, clara].map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Avatar collaborator={user} size="xs" />
                    <span className="text-xs text-ink-secondary flex-1">
                      {user.name.split(' ')[0]}
                    </span>
                    {user.id === 'user_alice' && (
                      <span className="text-2xs text-ink-muted">you</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Right Content ── */}
          <div className="flex flex-col gap-8 min-w-0">

            {/* Projects */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">Recent Projects</h3>
                <button
                  onClick={() => navigate('/project')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-violet hover:bg-accent-violet-dark text-white text-xs font-medium transition-colors"
                >
                  <Plus size={12} />
                  New project
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {MOCK_PROJECTS.map((p) => (
                  <ProjectCard key={p.id} project={p} realPreview={realPreview} />
                ))}
              </div>
            </section>

            {/* Contributions */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink-primary">Contributions</h3>
                <span className="text-2xs text-ink-muted">{TOTAL_CONTRIBS} contributions in the last 6 months</span>
              </div>
              <div className="border border-line rounded-xl p-4 bg-surface-1 overflow-x-auto">
                {/* Month labels */}
                <div className="mb-1.5" style={{ paddingLeft: 28 }}>
                  <div className="flex gap-[3px]">
                    {MONTH_LABELS.map((label, i) => (
                      <div key={i} className="text-2xs text-ink-muted flex-shrink-0" style={{ width: 11 }}>{label}</div>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div className="flex gap-1.5">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[3px] flex-shrink-0" style={{ width: 24 }}>
                    {DAY_LABELS.map((label, i) => (
                      <div key={i} className="text-2xs text-ink-muted flex items-center justify-end" style={{ height: 11 }}>
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Week columns — fixed 11px cells like GitHub */}
                  <div className="flex gap-[3px]">
                    {CONTRIB_GRID.map((week, w) => (
                      <div key={w} className="flex flex-col gap-[3px]">
                        {week.map((intensity, d) => (
                          <div
                            key={d}
                            className="rounded-sm flex-shrink-0"
                            title={intensity > 0 ? `${intensity} contribution${intensity > 1 ? 's' : ''}` : 'No contributions'}
                            style={{
                              width: 11,
                              height: 11,
                              background: '#8B5CF6',
                              opacity: intensity === 0 ? 0.07 : 0.18 + intensity * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-1.5 mt-3 justify-end">
                  <span className="text-2xs text-ink-muted">Less</span>
                  {[0.07, 0.28, 0.48, 0.68, 0.88].map((op, i) => (
                    <div key={i} className="rounded-sm flex-shrink-0 bg-accent-violet" style={{ width: 11, height: 11, opacity: op }} />
                  ))}
                  <span className="text-2xs text-ink-muted">More</span>
                </div>
              </div>
            </section>

            {/* Activity */}
            <section>
              <h3 className="text-sm font-semibold text-ink-primary mb-4">Activity</h3>
              <div className="border border-line rounded-xl overflow-hidden">
                {ACTIVITIES.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors ${
                      i < ACTIVITIES.length - 1 ? 'border-b border-line' : ''
                    }`}
                  >
                    <Avatar collaborator={item.actor} size="xs" />
                    <p className="flex-1 min-w-0 text-xs text-ink-secondary truncate">
                      <span className="font-medium text-ink-primary">
                        {item.actor.name.split(' ')[0]}
                      </span>{' '}
                      {item.verb}{' '}
                      <span className="font-medium" style={{ color: item.targetColor }}>
                        {item.target}
                      </span>
                    </p>
                    <span className="text-2xs text-ink-muted flex-shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
