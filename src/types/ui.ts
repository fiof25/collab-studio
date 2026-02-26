export type ModalType = 'merge' | 'newBranch' | 'branchSettings' | 'checkpoint' | 'comments' | null;
export type PanelSide = 'chat' | 'preview' | 'code';

export interface PanelState {
  activeSide: PanelSide;
  chatWidthPct: number;
  previewVisible: boolean;
}

export interface ToastPayload {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface UIState {
  activeModal: ModalType;
  modalContext: Record<string, unknown> | null;
  activeBranchId: string | null;
  hoveredBranchId: string | null;
  selectedBranchIds: string[];
  panel: PanelState;
  toasts: ToastPayload[];
}
