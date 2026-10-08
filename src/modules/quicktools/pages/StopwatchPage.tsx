/* Stopwatch with laps. */
import React, { useEffect, useRef, useState } from 'react';
import { Page, Card, Btn, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const c = Math.floor((total % 1000) / 10);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(m)}:${p(s)}.${p(c)}`;
}

export default function StopwatchPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // accumulated ms
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsed;
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 47);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => { setRunning(false); setElapsed(0); setLaps([]); };
  const lap = () => { if (running || elapsed > 0) setLaps((l) => [elapsed, ...l]); };

  return (
    <Page title="Stopwatch" subtitle="Precise timing with lap splits.">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div role="timer" aria-live="off"
              style={{ fontSize: 56, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>
              {fmt(elapsed)}
            </div>
            <div className="muted small">minutes : seconds . centiseconds</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn variant={running ? 'secondary' : 'primary'} onClick={toggle}
              icon={<DynIcon name={running ? 'Hourglass' : 'Timer'} size={16} />}>
              {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
            </Btn>
            <Btn variant="secondary" onClick={lap} disabled={!running && elapsed === 0}>Lap</Btn>
            <Btn variant="ghost" onClick={reset}>Reset</Btn>
          </div>
        </Card>

        <Card title={`Laps (${laps.length})`}>
          {laps.length === 0 ? (
            <EmptyState icon={<DynIcon name="Timer" size={36} />} title="No laps yet"
              text="Press Lap while the stopwatch is running to record splits." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {laps.map((l, i) => {
                const idx = laps.length - i;
                const prev = i === laps.length - 1 ? 0 : laps[i + 1];
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span className="muted">Lap {idx}</span>
                    <span>
                      <strong className="num">{fmt(l)}</strong>
                      <span className="muted small num" style={{ marginLeft: 10 }}>+{fmt(l - prev)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
