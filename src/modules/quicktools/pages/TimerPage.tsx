/* Countdown timer with oscillator beep on finish (no audio files). */
import React, { useEffect, useRef, useState } from 'react';
import { Page, Card, Btn, Field, NumberInput, ProgressBar, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      const t0 = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* audio not available — visual + toast still fire */ }
}

export default function TimerPage() {
  const [hh, setHh] = useState('0');
  const [mm, setMm] = useState('5');
  const [ss, setSs] = useState('0');
  const [total, setTotal] = useState(0); // seconds configured
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const remain = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) {
        clearInterval(t);
        setRunning(false);
        beep();
        toast.success("Time's up!");
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const start = () => {
    const secs = Math.max(0, Math.floor(Number(hh) || 0)) * 3600
      + Math.max(0, Math.floor(Number(mm) || 0)) * 60
      + Math.max(0, Math.floor(Number(ss) || 0));
    if (secs <= 0) { toast.error('Please set a duration greater than zero.'); return; }
    setTotal(secs);
    setLeft(secs);
    endRef.current = Date.now() + secs * 1000;
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    // keep remaining; resume recomputes end
  };
  const resume = () => {
    endRef.current = Date.now() + left * 1000;
    setRunning(true);
  };
  const cancel = () => { setRunning(false); setTotal(0); setLeft(0); };

  const active = total > 0;

  return (
    <Page title="Timer" subtitle="Countdown with an audible alert when it finishes.">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {!active ? (
          <Card title="Set duration">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
              <Field label="Hours"><NumberInput value={hh} min={0} max={99} onChange={(e) => setHh(e.target.value)} /></Field>
              <Field label="Minutes"><NumberInput value={mm} min={0} max={59} onChange={(e) => setMm(e.target.value)} /></Field>
              <Field label="Seconds"><NumberInput value={ss} min={0} max={59} onChange={(e) => setSs(e.target.value)} /></Field>
            </div>
            <Btn variant="primary" block icon={<DynIcon name="AlarmClock" size={16} />} onClick={start}>Start timer</Btn>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {[1, 5, 10, 15, 30].map((m) => (
                <Btn key={m} size="sm" variant="ghost" onClick={() => { setHh('0'); setMm(String(m)); setSs('0'); }}>{m} min</Btn>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div role="timer" aria-live="off"
                style={{ fontSize: 60, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>
                {fmt(left)}
              </div>
              <div style={{ marginTop: 12 }}>
                <ProgressBar value={total - left} max={total} />
              </div>
              <div className="muted small" style={{ marginTop: 8 }}>
                {running ? 'Running…' : left === 0 ? 'Finished' : 'Paused'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {running
                ? <Btn variant="secondary" onClick={pause}>Pause</Btn>
                : left > 0 && <Btn variant="primary" onClick={resume}>Resume</Btn>}
              <Btn variant="ghost" onClick={cancel}>Cancel</Btn>
            </div>
          </Card>
        )}
        <EmptyState icon={<DynIcon name="AlarmClock" size={36} />} title="Works offline"
          text="The timer runs entirely on your device — no internet needed." />
      </div>
    </Page>
  );
}
