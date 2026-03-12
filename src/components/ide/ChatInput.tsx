import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowUp, Square, Sparkles, X, Trash2, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useAIConfig } from '@/hooks/useAIConfig';

interface ChatInputProps {
  onSend: (message: string, tier: 'large' | 'small') => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  onClear?: () => void;
}

const SUGGESTIONS = [
  'Make a recipe app',
  'Create an interactive game',
  'Design a dashboard',
  'Build a portfolio site',
];

/** Shorten model IDs for display: "claude-sonnet-4-6" → "Sonnet 4.6" */
function formatModelName(model: string, provider: string): string {
  if (provider === 'claude') {
    const m = model.match(/claude-(\w+)-(\d+)-(\d+)/);
    if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`;
  }
  if (provider === 'gemini') {
    // "gemini-2.0-flash" → "Flash 2.0", "gemini-2.0-flash-lite" → "Flash Lite 2.0"
    const m = model.match(/gemini-([\d.]+)-(.+)/);
    if (m) {
      const variant = m[2].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      return `${variant} ${m[1]}`;
    }
  }
  return model;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled, onClear }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'large' | 'small'>('large');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const config = useAIConfig();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  // Close picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModelPicker]);

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
    onSend(trimmed, selectedTier);
    setValue('');
  };

  const handleSuggestion = (text: string) => {
    if (isStreaming) return;
    onSend(text, selectedTier);
  };

  const showChips = !value && !isStreaming && showSuggestions;
  const activeModel = config.models[selectedTier];
  const displayName = formatModelName(activeModel, config.provider);

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

          {/* Model selector */}
          <div className="relative ml-1" ref={pickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1 text-[10px] text-ink-muted/50 hover:text-ink-muted transition-colors"
            >
              <Sparkles size={9} />
              {displayName}
              <ChevronDown size={9} />
            </button>

            {showModelPicker && (
              <div className="absolute bottom-full left-0 mb-1 w-44 rounded-lg border border-line bg-surface-2 shadow-xl py-1 z-50">
                {(['large', 'small'] as const).map((tier) => {
                  const model = config.models[tier];
                  const label = tier === 'large' ? 'Large' : 'Small';
                  const isActive = selectedTier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => { setSelectedTier(tier); setShowModelPicker(false); }}
                      className={clsx(
                        'w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors',
                        isActive ? 'text-ink-primary bg-surface-3' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-3/50'
                      )}
                    >
                      <span>
                        <span className="font-medium">{label}</span>
                        <span className="ml-1.5 text-ink-muted/60">{formatModelName(model, config.provider)}</span>
                      </span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
