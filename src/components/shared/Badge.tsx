import { clsx } from 'clsx';
import type { BranchStatus } from '@/types/branch';

interface BadgeProps {
  status: BranchStatus;
  className?: string;
}

const config: Record<BranchStatus, { label: string; dot: string; bg: string; text: string }> = {
  active: {
    label: 'Active',
    dot: 'bg-status-active animate-pulse-slow',
    bg: 'bg-status-active/10',
    text: 'text-status-active',
  },
  archived: {
    label: 'Archived',
    dot: 'bg-status-archived',
    bg: 'bg-surface-3',
    text: 'text-ink-muted',
  },
  merging: {
    label: 'Merging',
    dot: 'bg-status-merging animate-pulse',
    bg: 'bg-status-merging/10',
    text: 'text-status-merging',
  },
  merged: {
    label: 'Merged',
    dot: 'bg-status-merged',
    bg: 'bg-status-merged/10',
    text: 'text-status-merged',
  },
};

export function Badge({ status, className }: BadgeProps) {
  const c = config[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium',
        c.bg,
        c.text,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}
