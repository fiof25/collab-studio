import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { hexToRgba } from '@/utils/colorUtils';

interface GradientCardProps {
  color?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  glow?: boolean;
  onClick?: () => void;
}

export function GradientCard({
  color = '#8B5CF6',
  className,
  innerClassName,
  children,
  glow = false,
  onClick,
}: GradientCardProps) {
  const glowStyle = glow
    ? { boxShadow: `0 0 24px ${hexToRgba(color, 0.3)}` }
    : {};

  return (
    <div
      className={clsx('rounded-2xl p-px', className)}
      style={{
        background: `linear-gradient(135deg, ${color}80 0%, ${color}30 100%)`,
        ...glowStyle,
      }}
      onClick={onClick}
    >
      <div
        className={clsx(
          'rounded-2xl w-full h-full bg-surface-1',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
