import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../storage/db';
import { prefs, setPrefs, DEFAULT_PREFS, Prefs } from '../lib/prefs';

interface SettingsCtx {
  prefs: Prefs;
  ready: boolean;
  update: (p: Partial<Prefs>) => Promise<void>;
}

const Ctx = createContext<SettingsCtx>({ prefs, ready: false, update: async () => {} });
export const useSettings = () => useContext(Ctx);

function resolveTheme(theme: Prefs['theme']): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ACCENTS: Record<string, { gold: string; deep: string }> = {
  gold: { gold: '#D4AF37', deep: '#a8842a' },
  navy: { gold: '#4d7cfe', deep: '#2f4fd6' },
  green: { gold: '#34b37a', deep: '#1f8a5b' },
  teal: { gold: '#2bb3a3', deep: '#178a7d' },
};

export function applyTheme(p: Prefs) {
  const t = resolveTheme(p.theme);
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0B1220' : '#0B1F3A');
  const a = ACCENTS[p.accent] || ACCENTS.gold;
  document.documentElement.style.setProperty('--gold', a.gold);
  document.documentElement.style.setProperty('--gold-deep', a.deep);
  document.documentElement.style.colorScheme = t;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snap, setSnap] = useState<Prefs>({ ...prefs });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await db.all<{ key: string; value: unknown }>('settings');
        const merged: Prefs = { ...DEFAULT_PREFS };
        for (const r of rows) {
          (merged as any)[r.key] = r.value;
        }
        setPrefs(merged);
        if (alive) {
          setSnap({ ...merged });
          applyTheme(merged);
          setReady(true);
        }
      } catch {
        if (alive) {
          applyTheme(prefs);
          setReady(true);
        }
      }
    })();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(prefs);
    mq.addEventListener('change', onChange);
    return () => {
      alive = false;
      mq.removeEventListener('change', onChange);
    };
  }, []);

  const update = async (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    setSnap({ ...next });
    applyTheme(next);
    for (const [k, v] of Object.entries(p)) {
      await db.set('settings', k, v);
    }
  };

  return <Ctx.Provider value={{ prefs: snap, ready, update }}>{children}</Ctx.Provider>;
}
