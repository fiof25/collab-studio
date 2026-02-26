import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useChatStream } from '@/hooks/useChatStream';

const SUGGESTIONS = [
  'Add a hero section with gradient',
  'Make it dark mode',
  'Add animation effects',
  'Make it mobile responsive',
  'Add feature cards section',
  'Improve typography',
  'Add a call-to-action button',
];

interface ChatInputProps {
  branchId: string;
}

export function ChatInput({ branchId }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useChatStream(branchId);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleSend = () => {
    if (!value.trim()) return;
    sendMessage(value);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setValue(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-shrink-0 p-3 border-t border-line bg-surface-1">
      {/* Suggestions */}
      <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-xs text-ink-secondary hover:text-ink-primary hover:border-accent-violet/50 transition-colors"
          >
            <Sparkles size={10} className="text-accent-violet flex-shrink-0" />
            {s}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div
        className={clsx(
          'flex items-end gap-2 rounded-2xl border transition-colors p-2',
          focused ? 'border-accent-violet bg-surface-2' : 'border-line bg-surface-2'
        )}
        style={
          focused
            ? { boxShadow: '0 0 0 3px rgba(139,92,246,0.12)' }
            : undefined
        }
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask AI to build something..."
          className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-muted resize-none focus:outline-none leading-relaxed min-h-[36px] py-1 px-2"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className={clsx(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
            value.trim()
              ? 'bg-gradient-to-br from-accent-violet to-accent-cyan text-white hover:opacity-90'
              : 'bg-surface-3 text-ink-muted cursor-not-allowed'
          )}
        >
          <Send size={14} />
        </button>
      </div>

      <p className="text-2xs text-ink-muted mt-1.5 text-center">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
