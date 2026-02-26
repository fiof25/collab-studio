import { useState, useRef, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { FullCodeViewer } from './CodeViewer';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';

interface PreviewPanelProps {
  branchId: string;
  accentColor: string;
}

type DeviceWidth = 'full' | 'tablet' | 'mobile';
type ActiveTab = 'preview' | 'code';

const deviceWidths: Record<DeviceWidth, string> = {
  full: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function PreviewPanel({ branchId, accentColor }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [device, setDevice] = useState<DeviceWidth>('full');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setPanelSide = useUIStore((s) => s.setPanelSide);
  const getBranchById = useProjectStore((s) => s.getBranchById);

  const branch = getBranchById(branchId);
  const latestCode = branch?.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '';

  useEffect(() => {
    setPanelSide(activeTab === 'code' ? 'code' : 'preview');
  }, [activeTab, setPanelSide]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Accent top border */}
      <div className="h-0.5 flex-shrink-0" style={{ background: accentColor }} />

      {/* Tab bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-1">
          {(['preview', 'code'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'text-ink-primary bg-surface-2'
                  : 'text-ink-muted hover:text-ink-secondary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'preview' && (
          <div className="flex items-center gap-1">
            {/* Device toggles */}
            <DeviceButton
              icon={<Monitor size={13} />}
              active={device === 'full'}
              onClick={() => setDevice('full')}
              title="Desktop"
            />
            <DeviceButton
              icon={<Tablet size={13} />}
              active={device === 'tablet'}
              onClick={() => setDevice('tablet')}
              title="Tablet"
            />
            <DeviceButton
              icon={<Smartphone size={13} />}
              active={device === 'mobile'}
              onClick={() => setDevice('mobile')}
              title="Mobile"
            />
            <div className="w-px h-4 bg-line mx-0.5" />
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              title="Refresh preview"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="w-full h-full flex items-stretch justify-center bg-surface-0 p-2">
            <div
              className="h-full bg-white rounded-lg overflow-hidden transition-all duration-300 shadow-float"
              style={{ width: deviceWidths[device], maxWidth: '100%' }}
            >
              {latestCode ? (
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  srcDoc={latestCode}
                  className="w-full h-full border-none"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p className="text-sm">No preview available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto">
            {latestCode ? (
              <FullCodeViewer code={latestCode} language="html" />
            ) : (
              <div className="flex items-center justify-center h-full text-ink-muted text-sm">
                No code to display
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
        active ? 'text-ink-primary bg-surface-3' : 'text-ink-muted hover:text-ink-secondary'
      )}
    >
      {icon}
    </button>
  );
}
