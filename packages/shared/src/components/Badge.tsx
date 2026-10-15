import React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral';
  pulse?: boolean;
}

export function Badge({ className, variant = 'default', pulse = false, children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        variants[variant],
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" aria-hidden="true" />}
      {children}
    </span>
  );
}
