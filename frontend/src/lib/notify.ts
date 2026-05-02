import { create } from "zustand";

export type ToastType = "error" | "success";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface NotifyState {
  toasts: Toast[];
  push: (message: string, type?: ToastType, durationMs?: number) => void;
  remove: (id: number) => void;
}

let nextId = 1;

const useNotifyStore = create<NotifyState>((set) => ({
  toasts: [],
  push: (message, type = "error", durationMs = 4000) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const notify = (msg: string, type: ToastType = "error", durationMs = 4000): void =>
  useNotifyStore.getState().push(msg, type, durationMs);

export const notifyError = (msg: string): void => notify(msg, "error");
export const notifySuccess = (msg: string): void => notify(msg, "success");

export default useNotifyStore;
