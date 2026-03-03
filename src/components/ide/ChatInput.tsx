import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowUp, Square, Sparkles, X, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  onClear?: () => void;
}

const SUGGESTIONS = [
  'Add a pricing section',
  'Make the hero bolder',
  'Add a dark mode toggle',
  'Add a testimonials section',
  'Make it mobile-friendly',
  'Add an FAQ section',
];

export function ChatInput({ onSend, onStop, isStreaming, disabled, onClear }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
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

  const showChips = !value && !isStreaming && showSuggestions;

  return (
    <div className="p-3 border-t border-line bg-surface-1">
      <div
        className={clsx(
          'rounded-2xl border border-line bg-surface-2 overflow-hidden transition-colors',
          'focus-within:border-white/20'
        )}
      >
        {/* Suggestion chips */}
        {showChips && (
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <Sparkles size={13} className="text-ink-muted flex-shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-2.5 py-1 rounded-full text-xs text-ink-muted bg-surface-3 hover:bg-surface-4 hover:text-ink-secondary transition-colors flex-shrink-0 whitespace-nowrap border border-line/50"
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-ink-muted hover:text-ink-secondary hover:bg-surface-3 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Make changes, add new features, ask for anything"
          rows={1}
          disabled={isStreaming || disabled}
          className={clsx(
            'w-full resize-none bg-transparent px-3 py-3 text-sm text-ink-primary placeholder:text-ink-muted outline-none min-h-[44px]',
            (isStreaming || disabled) && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Bottom action bar */}
        <div className="flex items-center gap-1 px-2.5 pb-2.5">
          {onClear && (
            <button
              onClick={onClear}
              disabled={isStreaming}
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-red-400 hover:bg-surface-3 transition-colors disabled:opacity-30"
              title="Clear thread"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span className="flex items-center gap-1 text-[10px] text-ink-muted/50 ml-1">
            <Sparkles size={9} />
            gemini-2.5-flash
          </span>
          <div className="flex-1" />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              title="Stop generation"
            >
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                value.trim() && !disabled
                  ? 'bg-white text-surface-0 hover:bg-white/90'
                  : 'bg-surface-3 text-ink-muted cursor-not-allowed'
              )}
              title="Send (Enter)"
            >
              <ArrowUp size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
