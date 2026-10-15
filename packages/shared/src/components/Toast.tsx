import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { dismissToastAtom, toastsAtom, type Toast } from '../atoms/toast';

const ICONS = {
  info: <Info className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />,
};

const STYLES = {
  info: 'border-indigo-300 bg-white shadow-lg shadow-indigo-950/5',
  success: 'border-emerald-300 bg-white shadow-lg shadow-emerald-950/5',
  error: 'border-rose-300 bg-white shadow-lg shadow-rose-950/5',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useSetAtom(dismissToastAtom);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      // Errors interrupt screen readers (alert); everything else is announced politely (status).
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl ring-1 ring-black/5 bg-white transition-all',
        STYLES[toast.variant]
      )}
    >
      <div className="shrink-0 mt-0.5">
        {ICONS[toast.variant]}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-bold text-slate-900 leading-snug">{toast.message}</p>
        {toast.description && <p className="text-xs text-slate-600 leading-normal">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Mount ONCE near the app root (inside the Jotai provider). Non-blocking: the container
 * ignores pointer events so it never covers page content; only the toasts are clickable.
 */
export function ToastViewport() {
  const toasts = useAtomValue(toastsAtom);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
