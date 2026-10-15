import React from 'react';
import { cn } from '../utils/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  onDismiss?: () => void;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  onDismiss,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />,
    danger: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />,
  };

  const variants = {
    info: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-900',
    danger: 'bg-rose-50/70 border-rose-200 text-rose-900',
  };

  return (
    <div
      role="alert"
      className={cn('relative flex gap-3 rounded-lg border p-4 text-sm', variants[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
