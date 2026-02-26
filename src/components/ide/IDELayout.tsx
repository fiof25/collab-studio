import { useRef, useState, useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';

interface IDELayoutProps {
  branchId: string;
  accentColor: string;
}

export function IDELayout({ branchId, accentColor }: IDELayoutProps) {
  const chatWidthPct = useUIStore((s) => s.panel.chatWidthPct);
  const setChatWidth = useUIStore((s) => s.setChatWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const onMouseMove = (ev: MouseEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setChatWidth(pct);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [setChatWidth]
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden"
      style={{ cursor: isDragging ? 'col-resize' : undefined }}
    >
      {/* Chat panel */}
      <div
        className="flex flex-col overflow-hidden border-r border-line"
        style={{ width: `${chatWidthPct}%` }}
      >
        <ChatPanel branchId={branchId} accentColor={accentColor} />
      </div>

      {/* Resizer */}
      <div
        className="w-1 flex-shrink-0 bg-line hover:bg-accent-violet/40 transition-colors cursor-col-resize group relative"
        onMouseDown={handleDividerMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Preview panel */}
      <div className="flex flex-col overflow-hidden flex-1">
        <PreviewPanel branchId={branchId} accentColor={accentColor} />
      </div>
    </div>
  );
}
