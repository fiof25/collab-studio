import { nanoid } from 'nanoid';

export const newBranchId = () => `branch_${nanoid(8)}`;
export const newMessageId = () => `msg_${nanoid(8)}`;
export const newCheckpointId = () => `ckpt_${nanoid(6)}`;
export const newToastId = () => `toast_${nanoid(6)}`;
