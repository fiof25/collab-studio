import { PreviewPanel } from './PreviewPanel';
import { ChatPanel } from './ChatPanel';

interface IDELayoutProps {
  branchId: string;
  accentColor: string;
}

export function IDELayout({ branchId, accentColor }: IDELayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <ChatPanel branchId={branchId} accentColor={accentColor} />
      <div className="w-px bg-line flex-shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <PreviewPanel branchId={branchId} accentColor={accentColor} />
      </div>
    </div>
  );
}
