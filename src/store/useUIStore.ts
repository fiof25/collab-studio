import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ModalType, PanelSide, ToastPayload, UIState } from '@/types/ui';

interface UIStore extends UIState {
  openModal: (type: ModalType, context?: Record<string, unknown>) => void;
  closeModal: () => void;
  setActiveBranch: (id: string | null) => void;
  setHoveredBranch: (id: string | null) => void;
  setPanelSide: (side: PanelSide) => void;
  pushToast: (payload: Omit<ToastPayload, 'id'>) => void;
  dismissToast: (id: string) => void;
  setLastUndo: (fn: (() => void) | null) => void;
  taskPanelOpen: boolean;
  toggleTaskPanel: () => void;
  commentsPanelOpen: boolean;
  toggleCommentsPanel: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  modalContext: null,
  activeBranchId: null,
  hoveredBranchId: null,
  selectedBranchIds: [],
  panel: {
    activeSide: 'preview',
    previewVisible: true,
  },
  toasts: [],
  lastUndo: null,
  taskPanelOpen: false,
  commentsPanelOpen: false,

  openModal: (type, context = {}) =>
    set({ activeModal: type, modalContext: context }),

  closeModal: () =>
    set({ activeModal: null, modalContext: null }),

  setActiveBranch: (id) => set({ activeBranchId: id }),
  setHoveredBranch: (id) => set({ hoveredBranchId: id }),

  setPanelSide: (side) =>
    set((s) => ({ panel: { ...s.panel, activeSide: side } })),

  pushToast: (payload) => {
    const id = nanoid(6);
    set((s) => ({ toasts: [...s.toasts, { ...payload, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, payload.duration ?? 3500);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setLastUndo: (fn) => set({ lastUndo: fn }),

  toggleTaskPanel: () => set((s) => ({ taskPanelOpen: !s.taskPanelOpen })),
  toggleCommentsPanel: () => set((s) => ({ commentsPanelOpen: !s.commentsPanelOpen })),
}));
