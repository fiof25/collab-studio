import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Circle, Clock, CheckCircle2, GitBranch, type LucideProps } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { Avatar } from '@/components/shared/Avatar';
import { toDisplayName } from '@/utils/branchUtils';
import type { Collaborator } from '@/types/branch';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

// ─── Types & mock data ────────────────────────────────────────────────────────

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  assignee: Collaborator;
  status: TaskStatus;
  branchName?: string;
  branchColor?: string;
}

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

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Fix CTA button padding on mobile',     assignee: alice, status: 'in-progress', branchName: 'hero-redesign',    branchColor: '#06B6D4' },
  { id: 't2', title: 'Write copy for hero subtitle',         assignee: alice, status: 'done',        branchName: 'hero-redesign',    branchColor: '#06B6D4' },
  { id: 't3', title: 'Review dark mode contrast ratios',     assignee: alice, status: 'todo',        branchName: 'dark-mode',        branchColor: '#A855F7' },
  { id: 't4', title: 'Test hamburger menu on Android',       assignee: bob,   status: 'done',        branchName: 'mobile-first',     branchColor: '#10B981' },
  { id: 't5', title: 'Core Web Vitals audit',                assignee: bob,   status: 'in-progress', branchName: 'perf-pass',        branchColor: '#F59E0B' },
  { id: 't6', title: 'Increase nav touch targets to 44px',   assignee: bob,   status: 'todo',        branchName: 'mobile-first',     branchColor: '#10B981' },
  { id: 't7', title: 'Finalize blend typography scale',      assignee: clara, status: 'todo',        branchName: 'dark-mobile-blend',branchColor: '#EC4899' },
  { id: 't8', title: 'Accessibility pass — nav links',       assignee: clara, status: 'todo',        branchName: 'dark-mode',        branchColor: '#A855F7' },
  { id: 't9', title: 'Reduce orb opacity from 15% to 10%',  assignee: clara, status: 'done',        branchName: 'hero-redesign',    branchColor: '#06B6D4' },
];

const CURRENT_USER_ID = 'user_alice';

// ─── Status config ────────────────────────────────────────────────────────────

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const STATUS_CONFIG: Record<TaskStatus, { icon: LucideIcon; label: string; color: string }> = {
  'todo':        { icon: Circle,       label: 'To do',      color: 'text-ink-muted' },
  'in-progress': { icon: Clock,        label: 'In progress', color: 'text-accent-amber' },
  'done':        { icon: CheckCircle2, label: 'Done',        color: 'text-status-active' },
};

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const { icon: Icon, color } = STATUS_CONFIG[task.status];
  const isDone = task.status === 'done';
  return (
    <div className="flex items-start gap-2 py-2 group">
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 flex-shrink-0 transition-colors hover:scale-110 ${color}`}
      >
        <Icon size={13} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${isDone ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
          {task.title}
        </p>
        {task.branchName && (
          <div className="flex items-center gap-1 mt-0.5">
            <GitBranch size={9} className="text-ink-muted flex-shrink-0" />
            <span className="text-2xs text-ink-muted truncate" style={{ color: task.branchColor + 'CC' }}>
              {toDisplayName(task.branchName)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'mine' | 'done';

const PANEL_W = 272;

export function TaskPanel() {
  const { taskPanelOpen, toggleTaskPanel, teamPanelOpen } = useUIStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTitle, setNewTitle] = useState('');
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskStatus = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in-progress' : 'done';
        return { ...t, status: next };
      })
    );
  };

  const addTask = (assigneeId: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) { setAddingFor(null); return; }
    const assignee = [alice, bob, clara].find((u) => u.id === assigneeId)!;
    setTasks((prev) => [
      ...prev,
      { id: `t${Date.now()}`, title: trimmed, assignee, status: 'todo' },
    ]);
    setNewTitle('');
    setAddingFor(null);
  };

  // Group by assignee
  const assignees = [alice, bob, clara];
  const filtered = tasks.filter((t) => {
    if (filter === 'mine') return t.assignee.id === CURRENT_USER_ID;
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  // Right offset — slide left if team panel is also open
  const rightOffset = teamPanelOpen ? PANEL_W + 288 : PANEL_W;

  const donePct = Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100);

  return (
    <AnimatePresence>
      {taskPanelOpen && (
        <motion.div
          initial={{ x: rightOffset, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: rightOffset, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed top-12 bottom-0 z-30 flex flex-col bg-surface-1 border-l border-line"
          style={{ right: teamPanelOpen ? 288 : 0, width: PANEL_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              {(['all', 'mine', 'done'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-surface-3 text-ink-primary'
                      : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
                  }`}
                >
                  {f === 'all' ? 'Tasks' : f === 'mine' ? 'Mine' : 'Done'}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTaskPanel}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2.5 border-b border-line flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-2xs text-ink-muted">Overall progress</span>
              <span className="text-2xs font-medium text-ink-primary">{donePct}%</span>
            </div>
            <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-status-active"
                initial={{ width: 0 }}
                animate={{ width: `${donePct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {assignees.map((assignee) => {
              const assigneeTasks = filtered.filter((t) => t.assignee.id === assignee.id);
              if (assigneeTasks.length === 0 && addingFor !== assignee.id) return null;
              const doneCount = tasks.filter((t) => t.assignee.id === assignee.id && t.status === 'done').length;
              const totalCount = tasks.filter((t) => t.assignee.id === assignee.id).length;
              return (
                <div key={assignee.id} className="mb-4">
                  {/* Assignee header */}
                  <div className="flex items-center gap-2 mb-1 py-1">
                    <Avatar collaborator={assignee} size="xs" />
                    <span className="text-xs font-semibold text-ink-primary flex-1">
                      {assignee.id === CURRENT_USER_ID ? 'You' : assignee.name.split(' ')[0]}
                    </span>
                    <span className="text-2xs text-ink-muted">{doneCount}/{totalCount}</span>
                    <button
                      onClick={() => setAddingFor(assignee.id)}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Tasks */}
                  <div className="pl-1 border-l-2 ml-2.5" style={{ borderColor: assignee.color + '40' }}>
                    {assigneeTasks.map((task) => (
                      <TaskRow key={task.id} task={task} onToggle={toggleStatus} />
                    ))}

                    {/* Inline add */}
                    {addingFor === assignee.id && (
                      <div className="flex items-center gap-2 py-2">
                        <Circle size={13} className="text-ink-muted flex-shrink-0 mt-0.5" />
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addTask(assignee.id);
                            if (e.key === 'Escape') { setAddingFor(null); setNewTitle(''); }
                          }}
                          onBlur={() => { addTask(assignee.id); }}
                          placeholder="New task…"
                          className="flex-1 text-xs bg-transparent outline-none text-ink-primary placeholder:text-ink-muted border-b border-line focus:border-accent-violet transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
