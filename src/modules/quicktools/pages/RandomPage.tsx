/* Random number generator with unique option and history. */
import React, { useState } from 'react';
import { Page, Card, Field, NumberInput, Switch, Btn, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { toNum, fmtInt } from '../../../lib/format';

interface Gen { nums: number[]; at: string; }

export default function RandomPage() {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [unique, setUnique] = useState(false);
  const [current, setCurrent] = useState<number[] | null>(null);
  const [history, setHistory] = useState<Gen[]>([]);

  const generate = () => {
    const lo = Math.floor(toNum(min, NaN));
    const hi = Math.floor(toNum(max, NaN));
    let n = Math.floor(toNum(count, NaN));
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { toast.error('Please enter valid min and max values.'); return; }
    if (lo > hi) { toast.error('Min cannot be greater than max.'); return; }
    if (!Number.isFinite(n) || n < 1) { toast.error('Count must be at least 1.'); return; }
    n = Math.min(n, 100);
    const range = hi - lo + 1;
    if (unique && n > range) { toast.error(`Cannot pick ${n} unique numbers from a range of ${range}.`); return; }
    const out: number[] = [];
    if (unique) {
      const pool = Array.from({ length: range }, (_, i) => lo + i);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
      }
    } else {
      for (let i = 0; i < n; i++) out.push(lo + Math.floor(Math.random() * range));
    }
    setCurrent(out);
    setHistory((h) => [{ nums: out, at: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) }, ...h].slice(0, 10));
  };

  return (
    <Page title="Random Number Generator" subtitle="Lucky draws, dice rolls and quick picks.">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            <Field label="Min"><NumberInput value={min} onChange={(e) => setMin(e.target.value)} /></Field>
            <Field label="Max"><NumberInput value={max} onChange={(e) => setMax(e.target.value)} /></Field>
            <Field label="How many"><NumberInput value={count} min={1} max={100} onChange={(e) => setCount(e.target.value)} /></Field>
          </div>
          <Switch label="Unique numbers (no repeats)" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
          <div style={{ marginTop: 12 }}>
            <Btn variant="primary" block icon={<DynIcon name="Shuffle" size={16} />} onClick={generate}>Generate</Btn>
          </div>
        </Card>

        {current ? (
          <Card title="Result">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', padding: '8px 0' }}>
              {current.map((x, i) => (
                <span key={i} className="num"
                  style={{ minWidth: 64, textAlign: 'center', fontSize: 26, fontWeight: 800,
                    padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, var(--navy), var(--navy-3))', color: '#fff' }}>
                  {fmtInt(x)}
                </span>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState icon={<DynIcon name="Shuffle" size={40} />} title="Ready when you are"
            text="Set a range and press Generate." />
        )}

        {history.length > 0 && (
          <Card title="History" actions={<Btn size="sm" variant="ghost" onClick={() => setHistory([])}>Clear</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                  <span className="num">{g.nums.map(fmtInt).join(', ')}</span>
                  <span className="muted small">{g.at}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
