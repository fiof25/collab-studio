import { create } from 'zustand';
import type { ViewportState } from '@/types/canvas';

interface CanvasStore {
  viewport: ViewportState;
  hoveredNodeId: string | null;
  previewPopupBranchId: string | null;
  previewPopupAnchor: { x: number; y: number } | null;
  fitViewTrigger: number;
  setViewport: (vp: ViewportState) => void;
  setHoveredNode: (id: string | null) => void;
  openPreviewPopup: (branchId: string, anchor: { x: number; y: number }) => void;
  closePreviewPopup: () => void;
  triggerFitView: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  hoveredNodeId: null,
  previewPopupBranchId: null,
  previewPopupAnchor: null,
  fitViewTrigger: 0,

  setViewport: (vp) => set({ viewport: vp }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  openPreviewPopup: (branchId, anchor) =>
    set({ previewPopupBranchId: branchId, previewPopupAnchor: anchor }),

  closePreviewPopup: () =>
    set({ previewPopupBranchId: null, previewPopupAnchor: null }),

  triggerFitView: () => set((s) => ({ fitViewTrigger: s.fitViewTrigger + 1 })),
}));
