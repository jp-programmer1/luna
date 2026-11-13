import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx, IconButton } from './ui';

/** Diálogo nativo (<dialog>): foco atrapado, Escape para cerrar y fondo inerte gratis. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cx(
        'm-auto w-[calc(100%-32px)] rounded-[20px] border border-line bg-surface p-0 text-ink backdrop:bg-[#07050c]/85',
        wide ? 'max-w-[980px]' : 'max-w-[580px]',
      )}
    >
      {open && (
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[28px] leading-tight font-bold">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose} className="-mt-1 -mr-2">
              <X className="size-5" />
            </IconButton>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
