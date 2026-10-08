/* Pomodoro Timer — 25/5 cycles with long break every 4 sessions. */
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Page, Card, Btn, Field, NumberInput, Segmented } from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { useNow, fmtDuration } from '../lib/timers';

type Mode = 'focus' | 'short' | 'long';

export default function PomodoroPage() {
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [mode, setMode] = useState<Mode>('focus');
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0); // completed focus sessions
  const endAt = useRef(0);
  const pausedLeft = useRef(0);
  const now = useNow(250);

  const modeMs = (m: Mode) => Math.max(1, durations[m]) * 60000;
  const remaining = running ? Math.max(0, endAt.current - now) : pausedLeft.current || modeMs(mode);

  const startMode = (m: Mode) => {
    setMode(m);
    endAt.current = Date.now() + modeMs(m);
    setRunning(true);
  };

  const toggle = () => {
    if (running) {
      pausedLeft.current = Math.max(0, endAt.current - Date.now());
      setRunning(false);
    } else {
      const left = pausedLeft.current > 0 ? pausedLeft.current : modeMs(mode);
      endAt.current = Date.now() + left;
      pausedLeft.current = 0;
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    pausedLeft.current = modeMs(mode);
  };

  useEffect(() => {
    if (!running) return;
    if (now < endAt.current) return;
    // session complete → advance
    if (mode === 'focus') {
      const done = sessions + 1;
      setSessions(done);
      const next: Mode = done % 4 === 0 ? 'long' : 'short';
      toast.success(`Focus session ${done} complete! Time for a ${next === 'long' ? 'long' : 'short'} break.`);
      setMode(next);
      endAt.current = Date.now() + modeMs(next);
    } else {
      toast.info('Break over — back to focus.');
      setMode('focus');
      endAt.current = Date.now() + modeMs('focus');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, running]);

  const labels: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

  return (
    <Page title="Pomodoro Timer" subtitle="Work in focused sprints — long break every 4 sessions.">
      <div className="grid cols-2">
        <Card title={labels[mode]} subtitle={running ? 'In progress…' : 'Paused'}>
          <Segmented<Mode>
            value={mode}
            onChange={(m) => { setRunning(false); pausedLeft.current = 0; setMode(m); }}
            options={[
              { value: 'focus', label: 'Focus' },
              { value: 'short', label: 'Short' },
              { value: 'long', label: 'Long' },
            ]}
          />
          <div className="timer-display" role="timer" style={{ marginTop: 16 }}>{fmtDuration(remaining)}</div>
          <div className="btn-row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Btn variant="primary" icon={running ? <Pause size={16} /> : <Play size={16} />} onClick={toggle}>
              {running ? 'Pause' : 'Start'}
            </Btn>
            <Btn variant="secondary" icon={<RotateCcw size={16} />} onClick={reset}>Reset</Btn>
            <Btn variant="ghost" onClick={() => startMode(mode === 'focus' ? 'short' : 'focus')}>
              Skip
            </Btn>
          </div>
          <div className="pomo-dots" aria-label={`${sessions % 4} of 4 sessions toward long break`}>
            {[0, 1, 2, 3].map((i) => <i key={i} className={i < sessions % 4 || (sessions > 0 && sessions % 4 === 0 && i < 4) ? 'done' : ''} />)}
          </div>
          <p className="timer-sub">{sessions} focus session{sessions === 1 ? '' : 's'} completed</p>
        </Card>

        <Card title="Durations" subtitle="Minutes per session">
          <Field label="Focus (minutes)">
            <NumberInput value={String(durations.focus)} onChange={(e) =>
              setDurations((d) => ({ ...d, focus: Math.max(1, Math.round(Number(e.target.value) || 25)) }))} />
          </Field>
          <Field label="Short break (minutes)">
            <NumberInput value={String(durations.short)} onChange={(e) =>
              setDurations((d) => ({ ...d, short: Math.max(1, Math.round(Number(e.target.value) || 5)) }))} />
          </Field>
          <Field label="Long break (minutes)">
            <NumberInput value={String(durations.long)} onChange={(e) =>
              setDurations((d) => ({ ...d, long: Math.max(1, Math.round(Number(e.target.value) || 15)) }))} />
          </Field>
          <p className="muted small">Changing a duration applies the next time that session starts.</p>
        </Card>
      </div>
    </Page>
  );
}
