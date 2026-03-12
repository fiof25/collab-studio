import { useState } from 'react';
import { Send } from 'lucide-react';
import { clsx } from 'clsx';
import type { Question } from '@/types/chat';

interface QuestionCardProps {
  questions: Question[];
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionCard({ questions, onAnswer, disabled }: QuestionCardProps) {
  const [customText, setCustomText] = useState('');

  const handleCustomSubmit = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onAnswer(trimmed);
    setCustomText('');
  };

  return (
    <div className="flex flex-col gap-3 mt-2 ml-1">
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-ink-secondary">{q.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onAnswer(opt.label)}
                disabled={disabled}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs text-ink-secondary',
                  'bg-surface-3 border border-line/50',
                  'hover:bg-surface-4 hover:text-ink-primary hover:border-line',
                  'transition-colors',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-ink-muted mr-1">{opt.key})</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Custom input */}
      <div className="flex items-center gap-1.5 mt-1">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
          placeholder="Or type your own..."
          disabled={disabled}
          className={clsx(
            'flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-surface-3 border border-line/50',
            'text-ink-secondary placeholder:text-ink-muted/50 outline-none',
            'focus:border-line',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        <button
          onClick={handleCustomSubmit}
          disabled={disabled || !customText.trim()}
          className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
            customText.trim() && !disabled
              ? 'bg-white/10 text-ink-secondary hover:bg-white/20'
              : 'bg-surface-3 text-ink-muted cursor-not-allowed'
          )}
        >
          <Send size={10} />
        </button>
      </div>
    </div>
  );
}
