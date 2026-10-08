import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, History } from 'lucide-react';
import { db, uid } from '../../../storage/db';
import { useLive } from '../../../hooks/useLive';
import {
  Page, Card, Btn, Field, NumberInput, Select, Segmented, EmptyState, Badge,
} from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { todayISO, fmtDate } from '../../../lib/format';

interface StudySession { id: string; subjectId?: string; minutes: number; date: string; note: string }
interface Subject { id: string; name: string; color: string }

type Mode = 'countdown' | 'pomodoro';
type Status = 'idle' | 'running' | 'paused';
type Phase = 'focus' | 'break';

const PRESETS = [
  { value: '25/5', label: '25 / 5 (classic)', focus: 25, brk: 5 },
  { value: '50/10', label: '50 / 10 (deep work)', focus: 50, brk: 10 },
  { value: 'custom', label: 'Custom', focus: 25, brk: 5 },
];

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function StudyTimerPage() {
  const { data: subjects } = useLive(() => db.all<Subject>('subjects'), []);
  const { data: sessions } = useLive(() => db.all<StudySession>('studySessions'), []);

  const [mode, setMode] = useState<Mode>('pomodoro');
  const [preset, setPreset] = useState('25/5');
  const [focusMin, setFocusMin] = useState('25');
  const [breakMin, setBreakMin] = useState('5');
  const [cycles, setCycles] = useState('4');
  const [countdownMin, setCountdownMin] = useState('30');
  const [subjectId, setSubjectId] = useState('');

  const [status, setStatus] = useState<Status>('idle');
  const [remainingMs, setRemainingMs] = useState(0);
  const [phase, setPhase] = useState<Phase>('focus');
  const [cycle, setCycle] = useState(1);

  const endAtRef = useRef(0);
  const runRef = useRef<{ mode: Mode; phase: Phase; cycle: number; totalMs: number } | null>(null);
  const configRef = useRef({ mode, preset, focusMin, breakMin, cycles, countdownMin, subjectId });
  configRef.current = { mode, preset, focusMin, breakMin, cycles, countdownMin, subjectId };
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const busy = status !== 'idle';

  /** Pomodoro durations read live from config (safe inside interval callbacks). */
  function pomoDurations() {
    const cc = configRef.current;
    const p = PRESETS.find((x) => x.value === cc.preset) || PRESETS[0];
    return {
      focus: cc.preset === 'custom' ? Math.max(1, parseFloat(cc.focusMin) || 25) : p.focus,
      brk: cc.preset === 'custom' ? Math.max(1, parseFloat(cc.breakMin) || 5) : p.brk,
      totalCycles: Math.max(1, Math.min(12, parseInt(cc.cycles, 10) || 4)),
    };
  }

  const cfg = useMemo(() => {
    const p = PRESETS.find((x) => x.value === preset) || PRESETS[0];
    const focus = preset === 'custom' ? Math.max(1, parseFloat(focusMin) || 25) : p.focus;
    const brk = preset === 'custom' ? Math.max(1, parseFloat(breakMin) || 5) : p.brk;
    const totalCycles = Math.max(1, Math.min(12, parseInt(cycles, 10) || 4));
    const cd = Math.max(1, parseFloat(countdownMin) || 30);
    return { focus, brk, totalCycles, cd };
  }, [preset, focusMin, breakMin, cycles, countdownMin]);

  async function logSession(minutes: number, note: string) {
    const sid = configRef.current.subjectId;
    await db.add('studySessions', {
      id: uid('ss_'),
      subjectId: sid || undefined,
      minutes: Math.round(minutes * 10) / 10,
      date: todayISO(),
      note,
    });
  }

  function begin(ms: number, ph: Phase, cyc: number, md: Mode) {
    endAtRef.current = Date.now() + ms;
    runRef.current = { mode: md, phase: ph, cycle: cyc, totalMs: ms };
    setPhase(ph);
    setCycle(cyc);
    setRemainingMs(ms);
    setStatus('running');
  }

  function completePhase() {
    const run = runRef.current;
    if (!run) return;
    const subj = (subjectsRef.current || []).find((s) => s.id === configRef.current.subjectId);
    const tag = subj ? ` · ${subj.name}` : '';

    if (run.mode === 'countdown') {
      logSession(run.totalMs / 60000, `Countdown${tag}`).catch(() => undefined);
      runRef.current = null;
      setStatus('idle');
      setRemainingMs(0);
      toast.success(`Time's up — ${Math.round(run.totalMs / 60000)} min session logged.`);
      return;
    }
    // pomodoro
    const { focus, brk, totalCycles } = pomoDurations();
    if (run.phase === 'focus') {
      logSession(run.totalMs / 60000, `Pomodoro focus ${run.cycle}${tag}`).catch(() => undefined);
      if (run.cycle < totalCycles) {
        toast.success(`Focus ${run.cycle} done — break time.`);
        begin(brk * 60000, 'break', run.cycle, 'pomodoro');
      } else {
        runRef.current = null;
        setStatus('idle');
        setRemainingMs(0);
        toast.success(`All ${totalCycles} Pomodoro cycles complete. Well done.`);
      }
    } else {
      toast.success('Break over — back to focus.');
      begin(focus * 60000, 'focus', run.cycle + 1, 'pomodoro');
    }
  }

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const left = endAtRef.current - Date.now();
      if (left <= 0) {
        clearInterval(id);
        setRemainingMs(0);
        completePhase();
      } else {
        setRemainingMs(left);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phase, cycle]);

  // tab title while running
  useEffect(() => {
    const base = 'PakUtility — Everyday tools. One place.';
    if (status === 'running') {
      document.title = `${mmss(remainingMs)} · ${phase === 'break' ? 'Break' : 'Focus'} — PakUtility`;
    } else {
      document.title = base;
    }
    return () => { document.title = base; };
  }, [status, remainingMs, phase]);

  function start() {
    if (mode === 'countdown') {
      begin(cfg.cd * 60000, 'focus', 1, 'countdown');
    } else {
      setPhase('focus');
      begin(cfg.focus * 60000, 'focus', 1, 'pomodoro');
    }
  }
  function pause() {
    setStatus('paused');
  }
  function resume() {
    endAtRef.current = Date.now() + remainingMs;
    setStatus('running');
  }
  function reset() {
    runRef.current = null;
    setStatus('idle');
    setRemainingMs(0);
    setPhase('focus');
    setCycle(1);
  }

  const todays = useMemo(
    () => (sessions || []).filter((s) => s.date === todayISO()).sort((a, b) => b.id.localeCompare(a.id)),
    [sessions],
  );
  const todayMinutes = useMemo(() => todays.reduce((s, x) => s + (Number.isFinite(x.minutes) ? x.minutes : 0), 0), [todays]);

  const totalMs = runRef.current?.totalMs || (mode === 'countdown' ? cfg.cd * 60000 : cfg.focus * 60000);
  const progress = totalMs > 0 ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100)) : 0;

  return (
    <Page title="Study Timer & Pomodoro" subtitle="Focus sessions with automatic logging.">
      <div className="grid cols-2">
        <Card title="Timer">
          <Field label="Mode">
            <Segmented
              options={[{ value: 'pomodoro' as Mode, label: 'Pomodoro' }, { value: 'countdown' as Mode, label: 'Countdown' }]}
              value={mode}
              onChange={(v) => { if (!busy) { setMode(v); reset(); } }}
            />
          </Field>

          {mode === 'pomodoro' ? (
            <>
              <Field label="Preset">
                <Select value={preset} onChange={(e) => setPreset(e.target.value)} disabled={busy}>
                  {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
              {preset === 'custom' && (
                <div className="form-row">
                  <Field label="Focus (min)">
                    <NumberInput value={focusMin} onChange={(e) => setFocusMin(e.target.value)} disabled={busy} />
                  </Field>
                  <Field label="Break (min)">
                    <NumberInput value={breakMin} onChange={(e) => setBreakMin(e.target.value)} disabled={busy} />
                  </Field>
                </div>
              )}
              <Field label="Focus cycles" hint="Focus → break repeats">
                <NumberInput value={cycles} onChange={(e) => setCycles(e.target.value)} disabled={busy} />
              </Field>
            </>
          ) : (
            <Field label="Minutes">
              <NumberInput value={countdownMin} onChange={(e) => setCountdownMin(e.target.value)} disabled={busy} placeholder="30" />
            </Field>
          )}

          <Field label="Subject (optional, for the log)">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={busy}>
              <option value="">No subject</option>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>

          <div style={{ textAlign: 'center', padding: '18px 0 8px' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
              {mode === 'pomodoro' && busy && <Badge tone={phase === 'break' ? 'blue' : 'gold'}>{phase === 'break' ? 'Break' : `Focus ${cycle} of ${cfg.totalCycles}`}</Badge>}
              {mode === 'countdown' && busy && <Badge tone="gold">Countdown</Badge>}
              {status === 'paused' && <Badge tone="gray">Paused</Badge>}
            </div>
            <div className="num" style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }} role="timer" aria-live="off">
              {mmss(remainingMs)}
            </div>
            <div style={{ marginTop: 10, height: 8, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.3s linear' }} />
            </div>
          </div>

          <div className="form-row" style={{ justifyContent: 'center', marginTop: 14 }}>
            {status === 'idle' && (
              <Btn variant="primary" icon={<Play size={16} />} onClick={start}>Start</Btn>
            )}
            {status === 'running' && (
              <Btn variant="secondary" icon={<Pause size={16} />} onClick={pause}>Pause</Btn>
            )}
            {status === 'paused' && (
              <>
                <Btn variant="primary" icon={<Play size={16} />} onClick={resume}>Resume</Btn>
                <Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={reset}>Reset</Btn>
              </>
            )}
            {status === 'running' && (
              <Btn variant="ghost" icon={<RotateCcw size={16} />} onClick={reset}>Stop</Btn>
            )}
          </div>
          <p className="muted small" style={{ textAlign: 'center', marginBottom: 0 }}>
            Timing is timestamp-based, so it keeps working if the tab is hidden or the phone sleeps.
          </p>
        </Card>

        <Card title="Today's sessions" actions={<Badge tone="gold">{todayMinutes.toFixed(0)} min</Badge>}>
          {todays.length === 0 ? (
            <EmptyState icon={<History size={40} />} title="No sessions yet" text="Completed focus sessions will be logged here automatically." />
          ) : (
            <div className="list">
              {todays.slice(0, 15).map((s) => (
                <div className="list-row" key={s.id}>
                  <div className="lr-ic"><TimerIcon size={19} /></div>
                  <div className="lr-main">
                    <div className="lr-title">{s.note || 'Study session'}</div>
                    <div className="lr-sub">{fmtDate(s.date)}</div>
                  </div>
                  <div className="lr-right"><div className="num" style={{ fontWeight: 700 }}>{s.minutes} min</div></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
