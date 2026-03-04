import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { useProjectsStore } from '@/store/useProjectsStore';

import { Avatar, AvatarGroup } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Collaborator, Project } from '@/types/branch';

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = Date.now();
const hour = 1000 * 60 * 60;
const day = hour * 24;

const alice: Collaborator = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: '/catpfp.jpg',
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
}

function toHomeProject(p: Project): HomeProject {
  const root = p.branches.find((b) => b.id === p.rootBranchId) ?? p.branches[0];
  const uniqueCollabs = [
    ...new Map(
      p.branches.flatMap((b) => b.collaborators).map((c) => [c.id, c])
    ).values(),
  ].slice(0, 4);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    branchCount: p.branches.length,
    snapshotCount: p.branches.reduce((n, b) => n + b.checkpoints.length, 0),
    collaborators: uniqueCollabs,
    updatedAt: p.updatedAt,
    accentColor: root?.color ?? '#8B5CF6',
    preview: root?.checkpoints.at(-1)?.codeSnapshot ?? '',
  };
}

interface ActivityItem {
  id: string;
  actor: Collaborator;
  verb: string;
  target: string;
  targetColor: string;
  timestamp: number;
}

const ACTIVITIES: ActivityItem[] = [
  { id: 'a1', actor: alice, verb: 'saved a checkpoint on', target: 'hero-redesign', targetColor: '', timestamp: now - hour * 0.2 },
  { id: 'a2', actor: bob, verb: 'left a comment on', target: 'dark-mode', targetColor: '', timestamp: now - hour * 1 },
  { id: 'a3', actor: clara, verb: 'created a new version from', target: 'mobile-first', targetColor: '', timestamp: now - hour * 2 },
  { id: 'a4', actor: alice, verb: 'blended', target: 'dark-mode + mobile-first', targetColor: '', timestamp: now - hour * 5 },
  { id: 'a5', actor: bob, verb: 'renamed', target: 'v3 → perf-pass', targetColor: '', timestamp: now - hour * 8 },
  { id: 'a6', actor: clara, verb: 'saved a checkpoint on', target: 'mobile-first', targetColor: '', timestamp: now - day * 1 },
  { id: 'a7', actor: alice, verb: 'created a new version from', target: 'hero-redesign', targetColor: '', timestamp: now - day * 1.2 },
  { id: 'a8', actor: bob, verb: 'saved a checkpoint on', target: 'dark-mode', targetColor: '', timestamp: now - day * 2 },
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
  onOpen,
}: {
  project: HomeProject;
  onOpen: () => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-surface-1 border cursor-pointer group transition-all duration-150"
      style={{ borderColor: 'rgb(var(--node-border))' }}
      onClick={onOpen}
    >
      {/* Preview */}
      <div className="overflow-hidden bg-surface-2 flex-shrink-0" style={{ height: CARD_PREVIEW_H }}>
        {project.preview ? (
          <iframe
            srcDoc={project.preview}
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
      <div className="px-2.5 pt-1.5 pb-2 flex flex-col gap-1">
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
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </div>
          <AvatarGroup collaborators={project.collaborators} max={3} size="xs" />
        </div>
      </div>
    </div>
  );
}

// ─── Activity List ────────────────────────────────────────────────────────────

function ActivityList({ limit }: { limit?: number }) {
  const items = limit ? ACTIVITIES.slice(0, limit) : ACTIVITIES;
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`flex items-center gap-2.5 px-3 py-2 bg-surface-1 hover:bg-surface-2 transition-colors ${
            i < items.length - 1 ? 'border-b border-line' : ''
          }`}
        >
          <Avatar collaborator={item.actor} size="xs" />
          <p className="flex-1 min-w-0 text-xs text-ink-secondary truncate">
            <span className="font-medium text-ink-primary">
              {item.actor.name.split(' ')[0]}
            </span>{' '}
            {item.verb}{' '}
            <span className="font-medium text-ink-primary">{item.target}</span>
          </p>
          <span className="text-2xs text-ink-muted flex-shrink-0">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const loadProject = useProjectStore((s) => s.loadProject);
  const { projects } = useProjectsStore();
  const homeProjects = projects.map(toHomeProject);
  const [activeTab, setActiveTab] = useState<'projects' | 'activity'>('projects');

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-line bg-surface-1/80 backdrop-blur-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-ink-primary">Collab Studio</span>
        </div>

        <nav className="flex items-center gap-0.5 text-xs">
          {(['projects', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-ink-primary bg-surface-2'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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

            {activeTab === 'projects' ? (
              <>
                {/* Projects */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-ink-primary">Recent Projects</h3>
                    <button
                      onClick={() => navigate('/project')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-sm font-medium transition-opacity"
                    >
                      <Plus size={14} />
                      New project
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {homeProjects.map((p, i) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onOpen={() => {
                          loadProject(projects[i]);
                          navigate('/project');
                        }}
                      />
                    ))}
                  </div>
                </section>

                {/* Activity preview */}
                <section>
                  <h3 className="text-sm font-semibold text-ink-primary mb-4">Recent Activity</h3>
                  <ActivityList limit={5} />
                </section>
              </>
            ) : (
              /* Full activity feed */
              <section>
                <h3 className="text-sm font-semibold text-ink-primary mb-4">All Activity</h3>
                <ActivityList />
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
