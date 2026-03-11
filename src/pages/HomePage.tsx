import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { useProjectsStore } from '@/store/useProjectsStore';

import { Avatar, AvatarGroup } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Collaborator, Project } from '@/types/branch';

// ─── Mock data ────────────────────────────────────────────────────────────────

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

// ─── Constants for iframe scaling ─────────────────────────────────────────────

const CARD_IFRAME_W = 960;
const CARD_PREVIEW_H = 180;

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
}: {
  project: HomeProject;
  onOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / CARD_IFRAME_W : 0.32;
  const iframeH = Math.ceil(CARD_PREVIEW_H / scale);

  return (
    <div
      className="rounded-md overflow-hidden bg-surface-1 border cursor-pointer group transition-all duration-150 hover:border-line-accent"
      style={{ borderColor: 'rgb(var(--node-border))' }}
      onClick={onOpen}
    >
      {/* Preview */}
      <div ref={containerRef} className="overflow-hidden bg-surface-2 flex-shrink-0" style={{ height: CARD_PREVIEW_H }}>
        {project.preview ? (
          <iframe
            srcDoc={project.preview}
            title={project.name}
            sandbox="allow-scripts"
            style={{
              width: CARD_IFRAME_W,
              height: iframeH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div className="w-full h-full bg-white" />
        )}
      </div>

      {/* Info strip */}
      <div className="px-3 pt-2 pb-2.5 flex flex-col gap-1 border-t border-line">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink-primary truncate">
            {project.name}
          </span>
          <ChevronRight
            size={13}
            className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted">{formatRelativeTime(project.updatedAt)}</span>
          <AvatarGroup collaborators={project.collaborators} max={3} size="xs" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const loadProject = useProjectStore((s) => s.loadProject);
  const { projects } = useProjectsStore();
  const homeProjects = projects.map(toHomeProject);

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-line bg-surface-1/80 backdrop-blur-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-ink-primary">Collab Studio</span>
        </div>

        <div className="flex items-center gap-2">
          <Avatar collaborator={alice} size="sm" />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-12 grid grid-cols-[240px_1fr] gap-16 items-start">

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
                <p className="text-xs font-google-sans text-ink-muted">@alice</p>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-ink-primary">Recent Projects</h3>
                <button
                  onClick={() => navigate('/project')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-sm font-medium transition-opacity"
                >
                  <Plus size={14} />
                  New project
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
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

          </div>
        </div>
      </div>
    </div>
  );
}
