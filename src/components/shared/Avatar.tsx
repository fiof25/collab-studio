import { type CSSProperties } from 'react';
import { clsx } from 'clsx';
import type { Collaborator } from '@/types/branch';

interface AvatarProps {
  collaborator: Collaborator;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

const sizeStyles = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
};

export function Avatar({ collaborator, size = 'sm', className, style }: AvatarProps) {
  return (
    <div
      className={clsx(
        'rounded-full ring-2 ring-surface-1 overflow-hidden flex-shrink-0 bg-surface-3',
        sizeStyles[size],
        className
      )}
      title={collaborator.name}
      style={style}
    >
      <img
        src={collaborator.avatarUrl}
        alt={collaborator.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

interface AvatarGroupProps {
  collaborators: Collaborator[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ collaborators, max = 3, size = 'sm' }: AvatarGroupProps) {
  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - max;

  return (
    <div className="flex items-center">
      {visible.map((c, i) => (
        <Avatar
          key={c.id}
          collaborator={c}
          size={size}
          className={i > 0 ? '-ml-1.5' : ''}
          style={{ zIndex: visible.length - i }}
        />
      ))}
      {overflow > 0 && (
        <div
          className={clsx(
            'rounded-full ring-2 ring-surface-1 bg-surface-3 flex items-center justify-center text-ink-muted font-medium -ml-1.5 flex-shrink-0',
            sizeStyles[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
