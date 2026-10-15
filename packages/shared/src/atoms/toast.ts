import { atom } from 'jotai';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  description?: string;
  variant: ToastVariant;
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed manually. */
  duration: number;
}

export interface ToastInput {
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION_MS = 4500;

/**
 * Cross-cutting UI state: the queue of visible toasts. Genuinely global and purely
 * client-side, so it belongs in Jotai (server data stays in TanStack Query).
 */
export const toastsAtom = atom<Toast[]>([]);

/** Write-only action atom: enqueue a toast and return its id. */
export const pushToastAtom = atom(null, (get, set, input: ToastInput): string => {
  const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: Toast = {
    id,
    message: input.message,
    description: input.description,
    variant: input.variant ?? 'info',
    duration: input.duration ?? DEFAULT_DURATION_MS,
  };
  // Keep only the most recent toasts so a burst of failures can't flood the screen.
  set(toastsAtom, [...get(toastsAtom), toast].slice(-MAX_VISIBLE_TOASTS));
  return id;
});

/** Write-only action atom: remove a toast by id. */
export const dismissToastAtom = atom(null, (get, set, id: string) => {
  set(
    toastsAtom,
    get(toastsAtom).filter((t) => t.id !== id)
  );
});
