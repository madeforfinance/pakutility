/* Minimal toast system — no external dependency. */
import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

let pushFn: ((kind: ToastKind, msg: string) => void) | null = null;
let seq = 1;

export const toast = {
  success(msg: string) {
    pushFn?.('success', msg);
  },
  error(msg: string) {
    pushFn?.('error', msg);
  },
  info(msg: string) {
    pushFn?.('info', msg);
  },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushFn = (kind, msg) => {
      const id = seq++;
      setItems((prev) => [...prev.slice(-2), { id, kind, msg }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    };
    const onOffline = () => pushFn?.('info', 'You are offline. Everything keeps working locally.');
    window.addEventListener('offline', onOffline);
    return () => {
      pushFn = null;
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'success' ? <CheckCircle2 /> : t.kind === 'error' ? <AlertCircle /> : <Info />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
