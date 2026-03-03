import { PreviewPanel } from './PreviewPanel';

interface IDELayoutProps {
  branchId: string;
  accentColor: string;
}

export function IDELayout({ branchId, accentColor }: IDELayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <PreviewPanel branchId={branchId} accentColor={accentColor} />
    </div>
  );
}
