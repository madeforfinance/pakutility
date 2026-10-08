/* Stopwatch — start/pause/lap/reset with lap list. */
import React, { useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { Page, Card, Btn, EmptyState } from '../../../components/ui';
import { useNow, fmtDuration } from '../lib/timers';

interface Lap { n: number; total: number; split: number; }

export default function StopwatchPage() {
  const [running, setRunning] = useState(false);
  const [accum, setAccum] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startRef = useRef(0);
  const now = useNow(97);

  const elapsed = running ? accum + (now - startRef.current) : accum;

  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    setAccum(elapsed);
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setAccum(0);
    setLaps([]);
  };
  const lap = () => {
    const prev = laps.length ? laps[laps.length - 1].total : 0;
    setLaps((p) => [...p, { n: p.length + 1, total: elapsed, split: elapsed - prev }]);
  };

  return (
    <Page title="Stopwatch" subtitle="Precision stopwatch with lap times.">
      <Card>
        <div className="timer-display" role="timer" aria-live="off">{fmtDuration(elapsed)}</div>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 18 }}>
          {!running ? (
            <Btn variant="primary" icon={<Play size={16} />} onClick={start}>
              {elapsed > 0 ? 'Resume' : 'Start'}
            </Btn>
          ) : (
            <Btn variant="primary" icon={<Pause size={16} />} onClick={pause}>Pause</Btn>
          )}
          <Btn variant="secondary" icon={<Flag size={16} />} onClick={lap} disabled={!running && elapsed === 0}>Lap</Btn>
          <Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={reset} disabled={elapsed === 0 && laps.length === 0}>Reset</Btn>
        </div>

        {laps.length === 0 ? (
          <EmptyState title="No laps yet" text="Press Lap while the stopwatch is running to record split times." />
        ) : (
          <ul className="lap-list" aria-label="Lap times">
            {[...laps].reverse().map((l) => (
              <li key={l.n}>
                <strong>Lap {l.n}</strong>
                <span className="muted">Split {fmtDuration(l.split)}</span>
                <span className="num"><strong>{fmtDuration(l.total)}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
