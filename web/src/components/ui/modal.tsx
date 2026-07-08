'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  panelClassName = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  panelClassName?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="app-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <button type="button" className="app-modal-backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className={`app-modal-panel animate-scale-in ${panelClassName}`}>
        {title ? (
          <div className="app-modal-header">
            <h2 id={titleId} className="text-xl font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className={title ? 'app-modal-body' : ''}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
