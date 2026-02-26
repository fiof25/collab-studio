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
  scheduleClosePreviewPopup: () => void;
  cancelClosePreviewPopup: () => void;
  triggerFitView: () => void;
}

// Module-level timer so BranchNode and BranchPreviewPopup share the same handle
let _closeTimer: ReturnType<typeof setTimeout> | null = null;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  hoveredNodeId: null,
  previewPopupBranchId: null,
  previewPopupAnchor: null,
  fitViewTrigger: 0,

  setViewport: (vp) => set({ viewport: vp }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  openPreviewPopup: (branchId, anchor) => {
    if (_closeTimer) {
      clearTimeout(_closeTimer);
      _closeTimer = null;
    }
    set({ previewPopupBranchId: branchId, previewPopupAnchor: anchor });
  },

  closePreviewPopup: () => {
    if (_closeTimer) {
      clearTimeout(_closeTimer);
      _closeTimer = null;
    }
    set({ previewPopupBranchId: null, previewPopupAnchor: null });
  },

  // Start a short delay before closing — gives the mouse time to reach the popup
  scheduleClosePreviewPopup: () => {
    if (_closeTimer) clearTimeout(_closeTimer);
    _closeTimer = setTimeout(() => {
      get().closePreviewPopup();
      _closeTimer = null;
    }, 120);
  },

  cancelClosePreviewPopup: () => {
    if (_closeTimer) {
      clearTimeout(_closeTimer);
      _closeTimer = null;
    }
  },

  triggerFitView: () => set((s) => ({ fitViewTrigger: s.fitViewTrigger + 1 })),
}));
