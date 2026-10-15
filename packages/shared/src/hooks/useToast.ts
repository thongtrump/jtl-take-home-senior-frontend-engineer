import { useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { dismissToastAtom, pushToastAtom, type ToastInput } from '../atoms/toast';

type ToastOptions = Omit<ToastInput, 'message' | 'variant'>;

/**
 * Fire-and-forget toast API. Uses write-only atoms, so components calling it do NOT
 * re-render when the toast queue changes (only <ToastViewport /> subscribes to it).
 */
export function useToast() {
  const push = useSetAtom(pushToastAtom);
  const dismiss = useSetAtom(dismissToastAtom);

  return useMemo(
    () => ({
      show: push,
      info: (message: string, options?: ToastOptions) => push({ ...options, message, variant: 'info' }),
      success: (message: string, options?: ToastOptions) => push({ ...options, message, variant: 'success' }),
      error: (message: string, options?: ToastOptions) => push({ ...options, message, variant: 'error' }),
      dismiss,
    }),
    [push, dismiss]
  );
}
