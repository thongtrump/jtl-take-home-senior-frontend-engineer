import React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
            {props.required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-colors',
            'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            error
              ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500'
              : 'border-slate-300 focus-visible:border-indigo-500 focus-visible:ring-indigo-500',
            props.disabled && 'cursor-not-allowed opacity-50 bg-slate-50',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-xs font-medium text-rose-600" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
