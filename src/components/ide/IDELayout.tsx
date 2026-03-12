import { useState } from 'react';
import { PreviewPanel } from './PreviewPanel';
import { ChatPanel } from './ChatPanel';

interface IDELayoutProps {
  branchId: string;
  accentColor: string;
}

export function IDELayout({ branchId, accentColor }: IDELayoutProps) {
  const [isPickMode, setIsPickMode] = useState(false);
  const [pickedElement, setPickedElement] = useState<string | null>(null);

  const handlePickElement = (elementText: string) => {
    setPickedElement(elementText);
    setIsPickMode(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <ChatPanel
        branchId={branchId}
        accentColor={accentColor}
        isPickMode={isPickMode}
        onTogglePickMode={() => setIsPickMode((v) => !v)}
        pickedElement={pickedElement}
        onClearPickedElement={() => setPickedElement(null)}
      />
      <div className="flex-1 min-w-0 overflow-hidden">
        <PreviewPanel
          branchId={branchId}
          accentColor={accentColor}
          isPickMode={isPickMode}
          onTogglePickMode={() => setIsPickMode((v) => !v)}
          onPickElement={handlePickElement}
        />
      </div>
    </div>
  );
}
