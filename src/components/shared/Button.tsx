import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline' | 'blend';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-accent-violet to-accent-cyan text-white hover:opacity-90 shadow-glow-violet/20',
  ghost:
    'bg-transparent text-ink-secondary border border-line hover:border-line-accent hover:text-ink-primary',
  danger:
    'bg-transparent text-red-400 border border-red-400/30 hover:bg-red-400/10 hover:border-red-400',
  outline:
    'bg-transparent text-ink-primary border border-line hover:bg-surface-2',
  blend:
    'bg-gradient-to-br from-accent-pink via-accent-violet to-accent-cyan text-white hover:opacity-90',
};

const sizeStyles: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-2xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
