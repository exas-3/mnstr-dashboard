'use client';

import { useEffect, useRef } from 'react';

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-12" onClick={onClose}>
      <div
        className="border-line bg-bg-2 mx-auto max-w-2xl border p-4"
        style={{ borderRadius: 'var(--radius)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mono text-fg-3 mb-2 text-[10px] uppercase tracking-widest">search</div>
        <input
          ref={ref}
          type="text"
          placeholder="wallet handle, 0x…, card title, set, cert #"
          className="bg-bg border-line text-fg w-full border px-3 py-2 text-sm outline-none"
          style={{ borderRadius: 'var(--radius)' }}
        />
        <div className="text-fg-4 mt-2 text-xs">
          <span className="mono">esc</span> to close · results coming in v1
        </div>
      </div>
    </div>
  );
}
