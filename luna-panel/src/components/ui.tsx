import { LoaderCircle } from 'lucide-react';
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink font-semibold hover:bg-brand-soft',
  secondary: 'border border-line-strong text-ink font-medium hover:bg-surface-2',
  ghost: 'text-ink-3 font-medium hover:text-ink hover:bg-surface-2',
  soft: 'bg-brand/15 text-[#ddd6fe] font-semibold hover:bg-brand/25',
  danger: 'text-danger font-medium hover:bg-danger/10',
};

const base =
  'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[10px] text-sm whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }
>(function Button({ variant = 'secondary', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={cx(base, variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({ variant = 'secondary', className, ...rest }: LinkProps & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...rest} />;
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-2 hover:text-ink cursor-pointer disabled:opacity-40', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface p-5', className)} {...rest}>
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">{children}</h2>;
}

export function Badge({ tone = 'brand', children }: { tone?: 'brand' | 'pending' | 'ok' | 'muted'; children: ReactNode }) {
  const tones = {
    brand: 'bg-brand/18 text-[#ddd6fe]',
    pending: 'bg-pending/15 text-pending',
    ok: 'bg-ok/15 text-ok',
    muted: 'bg-surface-2 text-muted',
  };
  return <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
}

/** Campo con etiqueta, ayuda y error, todos conectados por id para lectores de pantalla. */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-ink">
        {label} {optional && <span className="font-normal text-faint">(opcional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <span id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="text-[13px] text-faint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

const inputCls =
  'w-full min-h-11 rounded-[10px] border border-line-strong bg-surface-2 px-3.5 text-[15px] text-ink placeholder:text-faint/70 focus:border-brand focus:outline-none aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputCls, className)} {...rest} />;
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, 'py-2.5 resize-y', className)} {...rest} />;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx('relative h-8 w-[52px] shrink-0 rounded-full transition-colors cursor-pointer', checked ? 'bg-brand' : 'bg-line-strong')}
      >
        <span
          className={cx('absolute top-1 size-6 rounded-full bg-brand-ink transition-[left]', checked ? 'left-6' : 'left-1')}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="font-semibold">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-10 flex-1 rounded-[9px] font-semibold transition-colors cursor-pointer',
              o.value === value ? 'bg-brand text-brand-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-muted" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="font-display text-[32px] leading-tight font-bold md:text-4xl">{title}</h1>
        {description && <p className="text-[15px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
