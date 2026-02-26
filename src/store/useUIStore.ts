import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ModalType, PanelSide, ToastPayload, UIState } from '@/types/ui';

interface UIStore extends UIState {
  openModal: (type: ModalType, context?: Record<string, unknown>) => void;
  closeModal: () => void;
  setActiveBranch: (id: string | null) => void;
  setHoveredBranch: (id: string | null) => void;
  setPanelSide: (side: PanelSide) => void;
  setChatWidth: (pct: number) => void;
  pushToast: (payload: Omit<ToastPayload, 'id'>) => void;
  dismissToast: (id: string) => void;
  teamPanelOpen: boolean;
  toggleTeamPanel: () => void;
  taskPanelOpen: boolean;
  toggleTaskPanel: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  modalContext: null,
  activeBranchId: null,
  hoveredBranchId: null,
  selectedBranchIds: [],
  panel: {
    activeSide: 'chat',
    chatWidthPct: 45,
    previewVisible: true,
  },
  toasts: [],
  teamPanelOpen: false,
  taskPanelOpen: false,

  openModal: (type, context = {}) =>
    set({ activeModal: type, modalContext: context }),

  closeModal: () =>
    set({ activeModal: null, modalContext: null }),

  setActiveBranch: (id) => set({ activeBranchId: id }),
  setHoveredBranch: (id) => set({ hoveredBranchId: id }),

  setPanelSide: (side) =>
    set((s) => ({ panel: { ...s.panel, activeSide: side } })),

  setChatWidth: (pct) =>
    set((s) => ({ panel: { ...s.panel, chatWidthPct: Math.min(80, Math.max(20, pct)) } })),

  pushToast: (payload) => {
    const id = nanoid(6);
    set((s) => ({ toasts: [...s.toasts, { ...payload, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, payload.duration ?? 3500);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toggleTeamPanel: () => set((s) => ({ teamPanelOpen: !s.teamPanelOpen })),
  toggleTaskPanel: () => set((s) => ({ taskPanelOpen: !s.taskPanelOpen })),
}));
