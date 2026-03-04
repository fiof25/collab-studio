export type ModalType = 'merge' | 'newBranch' | 'newDraft' | 'branchSettings' | 'checkpoint' | 'comments' | null;
export type PanelSide = 'preview' | 'code';

export interface PanelState {
  activeSide: PanelSide;
  previewVisible: boolean;
}

export interface ToastPayload {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
  onUndo?: () => void;
}

export interface UIState {
  activeModal: ModalType;
  modalContext: Record<string, unknown> | null;
  activeBranchId: string | null;
  hoveredBranchId: string | null;
  selectedBranchIds: string[];
  panel: PanelState;
  toasts: ToastPayload[];
  lastUndo: (() => void) | null;
}
