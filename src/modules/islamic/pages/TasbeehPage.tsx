import React, { useEffect, useRef, useState } from 'react';
import { Page, Card, Field, TextInput, Btn, Chip, ProgressBar } from '../../../components/ui';
import { RotateCcw } from 'lucide-react';
import { db } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { fmtInt } from '../../../lib/format';

const TARGETS = [33, 100, 500, 1000];
const DHIKR_PRESETS = ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'La ilaha illallah', 'Astaghfirullah'];

interface Saved { count: number; target: number; dhikr: string; }

function ProgressRing({ value, max, size = 220 }: { value: number; max: number; size?: number }) {
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`${value} of ${max}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gold)"
        strokeWidth="12" strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.15s ease' }} />
      <text x="50%" y="46%" textAnchor="middle" fontSize="44" fontWeight="800" fill="var(--text)">
        {fmtInt(value)}
      </text>
      <text x="50%" y="60%" textAnchor="middle" fontSize="15" fill="var(--muted)">of {fmtInt(max)}</text>
    </svg>
  );
}

export default function TasbeehPage() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [dhikr, setDhikr] = useState('SubhanAllah');
  const [custom, setCustom] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    db.get<{ key: string; value: unknown }>('settings', 'tasbeeh').then((r) => {
      if (alive && r?.value && typeof r.value === 'object') {
        const s = r.value as Partial<Saved>;
        if (typeof s.count === 'number') setCount(Math.max(0, Math.floor(s.count)));
        if (typeof s.target === 'number' && s.target > 0) setTarget(Math.floor(s.target));
        if (typeof s.dhikr === 'string' && s.dhikr) {
          setDhikr(s.dhikr);
          if (!DHIKR_PRESETS.includes(s.dhikr)) setCustom(s.dhikr);
        }
      }
      if (alive) setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      db.set('settings', 'tasbeeh', { count, target, dhikr } as Saved).catch(() => {});
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [count, target, dhikr, loaded]);

  const tap = () => {
    const next = count + 1;
    setCount(next);
    if (next % target === 0) {
      try { navigator.vibrate?.(200); } catch { /* unsupported */ }
      toast.success(`MashaAllah! ${fmtInt(target)} completed.`);
    }
  };

  const reset = () => setCount(0);

  const completed = target > 0 ? Math.floor(count / target) : 0;

  return (
    <Page title="Tasbeeh Counter" subtitle="Tap to count your dhikr">
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, minHeight: 24 }}>{dhikr}</div>
            <button
              onClick={tap}
              aria-label={`Count one ${dhikr}. Current count ${count}.`}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: '50%', WebkitTapHighlightColor: 'transparent',
              }}>
              <ProgressRing value={target > 0 ? count % target : 0} max={target} />
            </button>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <Btn variant="primary" onClick={tap} style={{ minWidth: 180, minHeight: 56, fontSize: 17 }}>
                Tap to count
              </Btn>
              <Btn onClick={reset} icon={<RotateCcw size={15} />} aria-label="Reset counter">Reset</Btn>
            </div>
            {completed > 0 && (
              <p className="small muted" style={{ marginTop: 10 }}>
                {completed} × {fmtInt(target)} completed · {fmtInt(count)} total
              </p>
            )}
          </div>
        </Card>

        <div>
          <Card title="Target">
            <div className="chip-row">
              {TARGETS.map((t) => (
                <Chip key={t} active={target === t} onClick={() => setTarget(t)}>{fmtInt(t)}</Chip>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar value={target > 0 ? (count % target) / target * 100 : 0} />
            </div>
          </Card>
          <Card title="Dhikr" style={{ marginTop: 16 }}>
            <div className="chip-row">
              {DHIKR_PRESETS.map((d) => (
                <Chip key={d} active={dhikr === d} onClick={() => { setDhikr(d); setCustom(''); }}>{d}</Chip>
              ))}
            </div>
            <Field label="Custom dhikr" hint="Optional — type your own" >
              <TextInput value={custom} onChange={(e) => { setCustom(e.target.value); if (e.target.value.trim()) setDhikr(e.target.value.trim()); }}
                placeholder="e.g. SubhanAllahi wa bihamdihi" maxLength={80} />
            </Field>
          </Card>
        </div>
      </div>
    </Page>
  );
}
