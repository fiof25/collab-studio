import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface GradientCardProps {
  color?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  glow?: boolean;
  onClick?: () => void;
}

export function GradientCard({
  className,
  innerClassName,
  children,
  onClick,
}: GradientCardProps) {
  return (
    <div
      className={clsx('rounded-2xl border border-line bg-surface-1', className, innerClassName)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
