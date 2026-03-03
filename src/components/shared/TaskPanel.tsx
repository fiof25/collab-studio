import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, ClipboardList, Plus, Check, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/store/useUIStore';
import { Avatar } from '@/components/shared/Avatar';
import type { Collaborator } from '@/types/branch';

const PANEL_W = 300;

type TaskStatus = 'todo' | 'doing' | 'done';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: Collaborator;
  tag?: string;
}

const ALICE: Collaborator = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: '/catpfp.jpg',
  color: '#8B5CF6',
};
const BOB: Collaborator = {
  id: 'user_bob',
  name: 'Bob Tran',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
  color: '#06B6D4',
};
const CLARA: Collaborator = {
  id: 'user_clara',
  name: 'Clara Sun',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
  color: '#EC4899',
};

const ALL_PEOPLE = [ALICE, BOB, CLARA];

const INITIAL_TASKS: Task[] = [
  // Unassigned
  { id: 't7', title: 'Share prototype link with stakeholders', status: 'todo',  tag: 'Review' },
  // Alice
  { id: 't1', title: 'Finalize hero section copy',           status: 'done',  assignee: ALICE, tag: 'Copy'   },
  { id: 't4', title: 'Add pricing section to main version',  status: 'doing', assignee: ALICE, tag: 'Design' },
  // Bob
  { id: 't2', title: 'Test mobile layout on iPhone 14',      status: 'done',  assignee: BOB,   tag: 'QA'     },
  { id: 't5', title: 'Get sign-off on CTA button colour',    status: 'todo',  assignee: BOB,   tag: 'Design' },
  // Clara
  { id: 't3', title: 'Review dark mode version with team',   status: 'doing', assignee: CLARA, tag: 'Design' },
  { id: 't6', title: 'Write FAQ content',                    status: 'todo',  assignee: CLARA, tag: 'Copy'   },
];

export function TaskPanel() {
  const { taskPanelOpen, toggleTaskPanel } = useUIStore();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTitle, setNewTitle] = useState('');
  const [addingOpen, setAddingOpen] = useState(false);

  const toggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t
      )
    );
  };

  const addTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setTasks((prev) => [{ id: `t${Date.now()}`, title: trimmed, status: 'todo' }, ...prev]);
    setNewTitle('');
    setAddingOpen(false);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Reorder only the active (non-done) tasks in a section; done tasks stay at the bottom
  const reorderSection = (assigneeId: string | null, reorderedActive: Task[]) => {
    setTasks((prev) => {
      const doneTasks = prev.filter(
        (t) => (t.assignee?.id ?? null) === assigneeId && t.status === 'done'
      );
      const result: Task[] = [];
      let inserted = false;
      for (const task of prev) {
        const tid = task.assignee?.id ?? null;
        if (tid === assigneeId) {
          if (!inserted) {
            result.push(...reorderedActive, ...doneTasks);
            inserted = true;
          }
        } else {
          result.push(task);
        }
      }
      return result;
    });
  };

  const unassigned = tasks.filter((t) => !t.assignee);
  const assignedGroups = ALL_PEOPLE.map((person) => ({
    person,
    tasks: tasks.filter((t) => t.assignee?.id === person.id),
  })).filter((g) => g.tasks.length > 0);

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <AnimatePresence>
      {taskPanelOpen && (
        <motion.div
          initial={{ x: PANEL_W, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: PANEL_W, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed top-12 bottom-0 z-30 flex flex-col bg-surface-1 border-l border-line"
          style={{ right: 0, width: PANEL_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} className="text-ink-muted" />
              <span className="text-sm font-semibold text-ink-primary">Tasks</span>
              <span className="text-xs text-ink-muted/60 ml-0.5">{doneCount}/{tasks.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAddingOpen((v) => !v)}
                title="Add task"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <Plus size={13} />
              </button>
              <button
                onClick={toggleTaskPanel}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* New task input */}
          <AnimatePresence>
            {addingOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden border-b border-line flex-shrink-0"
              >
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-4 h-4 rounded border border-line flex-shrink-0" />
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTask();
                      if (e.key === 'Escape') setAddingOpen(false);
                    }}
                    placeholder="New task…"
                    className="flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTitle.trim()}
                    className="text-xs text-ink-muted hover:text-ink-primary disabled:opacity-30 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task groups */}
          <div className="flex-1 overflow-y-auto py-2">
            {/* Per-person groups */}
            {assignedGroups.map(({ person, tasks: groupTasks }) => {
              const remaining = groupTasks.filter((t) => t.status !== 'done').length;
              return (
                <div key={person.id} className="mb-4">
                  <div className="flex items-center gap-2 px-4 pt-1 pb-1.5">
                    <Avatar collaborator={person} size="xs" />
                    <span className="text-xs font-medium text-ink-secondary">{person.name}</span>
                    {person.id === 'user_alice' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-ink-muted font-medium">You</span>
                    )}
                    {remaining > 0 && (
                      <span className="text-[10px] text-ink-muted ml-auto">{remaining} left</span>
                    )}
                  </div>
                  <SectionTasks
                    tasks={groupTasks}
                    onToggle={toggle}
                    onDelete={deleteTask}
                    onReorder={(items) => reorderSection(person.id, items)}
                  />
                </div>
              );
            })}

            {/* Unassigned — at the bottom */}
            {unassigned.length > 0 && (
              <div className="mb-4">
                <div className="px-4 pt-1 pb-1.5">
                  <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Unassigned
                  </span>
                </div>
                <SectionTasks
                  tasks={unassigned}
                  onToggle={toggle}
                  onDelete={deleteTask}
                  onReorder={(items) => reorderSection(null, items)}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SectionTasksProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (items: Task[]) => void;
}

function SectionTasks({ tasks, onToggle, onDelete, onReorder }: SectionTasksProps) {
  const active = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <>
      <Reorder.Group as="div" axis="y" values={active} onReorder={onReorder}>
        {active.map((task) => (
          <Reorder.Item as="div" key={task.id} value={task} whileDrag={{ opacity: 0.85, scale: 1.01, zIndex: 50 }}>
            <TaskRow task={task} onToggle={onToggle} onDelete={onDelete} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {done.map((task) => (
        <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = task.status === 'done';

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors group">
      {/* Drag handle — hidden for done tasks */}
      {!isDone ? (
        <GripVertical
          size={12}
          className="text-ink-muted/0 group-hover:text-ink-muted/30 flex-shrink-0 cursor-grab transition-colors"
        />
      ) : (
        <div className="w-3 flex-shrink-0" />
      )}

      {/* Checkbox */}
      <button
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={() => onToggle(task.id)}
        className={clsx(
          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
          isDone
            ? 'bg-surface-3 border-line/60 text-ink-muted'
            : 'border-line hover:border-ink-muted/60'
        )}
      >
        {isDone && <Check size={9} strokeWidth={2.5} />}
      </button>

      {/* Title */}
      <span
        className={clsx(
          'flex-1 text-sm leading-snug min-w-0 truncate',
          isDone ? 'text-ink-muted line-through' : 'text-ink-secondary'
        )}
      >
        {task.title}
      </span>

      {/* Delete — shows on hover */}
      <button
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-ink-muted hover:text-red-400 transition-all flex-shrink-0"
      >
        <X size={11} />
      </button>
    </div>
  );
}
