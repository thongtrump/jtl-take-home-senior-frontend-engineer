import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ className, size = 'md', label = 'Loading...' }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="inline-flex items-center gap-2 text-slate-500" role="status">
      <Loader2 className={cn('animate-spin text-indigo-600', sizes[size], className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
