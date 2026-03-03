import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const SUGGESTIONS = [
  'Add a pricing section',
  'Make the hero section bolder',
  'Add a dark mode toggle',
  'Add a testimonials section',
  'Make it mobile-friendly',
];

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const handleSuggestion = (text: string) => {
    if (isStreaming) return;
    onSend(text);
  };

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-line bg-surface-1">
      {!value && !isStreaming && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="px-2.5 py-1 rounded-full text-xs text-ink-muted bg-surface-2 hover:bg-surface-3 hover:text-ink-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what to change…"
          rows={1}
          disabled={isStreaming || disabled}
          className={clsx(
            'flex-1 resize-none bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-colors min-h-[40px]',
            'focus:border-white/30 focus:bg-surface-3',
            (isStreaming || disabled) && 'opacity-50 cursor-not-allowed'
          )}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors flex-shrink-0"
            title="Stop generation"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              value.trim() && !disabled
                ? 'bg-white hover:bg-white/90 text-surface-0'
                : 'bg-surface-2 text-ink-muted cursor-not-allowed'
            )}
            title="Send (Enter)"
          >
            <Send size={14} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-ink-muted/60 text-center">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
