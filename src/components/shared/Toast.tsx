import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/store/useUIStore';
import type { ToastPayload } from '@/types/ui';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'text-status-active border-status-active/30',
  error: 'text-status-error border-status-error/30',
  info: 'text-accent-violet border-accent-violet/30',
  warning: 'text-status-merging border-status-merging/30',
};

function Toast({ toast }: { toast: ToastPayload }) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const Icon = iconMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-2xl glass border shadow-float',
        'max-w-sm w-full pointer-events-auto',
        colorMap[toast.type]
      )}
    >
      <Icon size={16} className="flex-shrink-0" />
      <p className="text-sm text-ink-primary flex-1">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-ink-muted hover:text-ink-primary transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
