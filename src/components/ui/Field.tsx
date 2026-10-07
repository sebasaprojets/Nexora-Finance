import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { t } from '@/i18n';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-xl border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors outline-none hover:border-border-strong focus:border-primary focus:bg-surface focus:shadow-[var(--ring)] disabled:opacity-60 aria-[invalid=true]:border-danger';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  required?: boolean;
}

/** Wrapper acessível: associa label, dica e erro ao controle. */
export function Field({ label, hint, error, className, children, required }: FieldProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-fg-muted">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': descId })}
      {(error || hint) && (
        <p id={descId} role={error ? 'alert' : undefined} className={cn('text-xs', error ? 'text-danger' : 'text-fg-subtle')}>
          {error ? t(error) : hint}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, leftIcon, rightSlot, ...props }, ref) {
  if (!leftIcon && !rightSlot) return <input ref={ref} className={cn(control, 'h-11', className)} {...props} />;
  return (
    <div className="relative">
      {leftIcon && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle [&>svg]:size-4">{leftIcon}</span>}
      <input ref={ref} className={cn(control, 'h-11', leftIcon && 'pl-10', rightSlot && 'pr-11', className)} {...props} />
      {rightSlot && <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{rightSlot}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-20 py-2.5', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'h-11 cursor-pointer appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
});
