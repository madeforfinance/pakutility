/* Meeting Timer — per-agenda-item countdowns with next/previous and total elapsed. */
import React, { useEffect, useRef, useState } from 'react';
import { Play, SkipForward, SkipBack, Square, Plus, Trash2, ListChecks } from 'lucide-react';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, EmptyState, ProgressBar } from '../../../components/ui';
import { toast } from '../../../lib/toast';
import { fmtNum } from '../../../lib/format';
import { useNow, fmtDuration, minToHM } from '../lib/timers';

interface AgendaItem { id: string; title: string; minutes: number; }
let aid = 0;
const nid = () => `ag_${Date.now()}_${aid++}`;

export default function MeetingTimerPage() {
  const [items, setItems] = useState<AgendaItem[]>([
    { id: nid(), title: 'Updates', minutes: 10 },
    { id: nid(), title: 'Discussion', minutes: 20 },
  ]);
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup');
  const [idx, setIdx] = useState(0);
  const [summary, setSummary] = useState<{ planned: number; actual: number } | null>(null);

  const itemEndAt = useRef(0);
  const meetingStart = useRef(0);
  const spent = useRef<number[]>([]);
  const now = useNow(250);

  const plannedTotal = items.reduce((s, it) => s + it.minutes * 60000, 0);

  const finish = () => {
    const actual = spent.current.reduce((s, v) => s + v, 0);
    setSummary({ planned: plannedTotal, actual });
    setPhase('done');
  };

  const goTo = (ni: number) => {
    const item = items[idx];
    if (!item) { finish(); return; }
    const remaining = Math.max(0, itemEndAt.current - Date.now());
    spent.current[idx] = (spent.current[idx] || 0) + (item.minutes * 60000 - remaining);
    if (ni >= items.length) { finish(); return; }
    const clamped = Math.max(0, ni);
    setIdx(clamped);
    itemEndAt.current = Date.now() + items[clamped].minutes * 60000;
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const item = items[idx];
    if (!item) { finish(); return; }
    if (now >= itemEndAt.current) {
      spent.current[idx] = item.minutes * 60000;
      toast.info(`Time's up: ${item.title}`);
      if (idx + 1 >= items.length) finish();
      else {
        const ni = idx + 1;
        setIdx(ni);
        itemEndAt.current = Date.now() + items[ni].minutes * 60000;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase, idx]);

  const start = () => {
    const clean = items.map((it) => ({ ...it, title: it.title.trim(), minutes: Math.max(1, Math.round(it.minutes)) }));
    if (clean.length === 0 || clean.some((it) => !it.title)) {
      toast.error('Add at least one agenda item with a title.');
      return;
    }
    setItems(clean);
    spent.current = clean.map(() => 0);
    setIdx(0);
    setSummary(null);
    meetingStart.current = Date.now();
    itemEndAt.current = Date.now() + clean[0].minutes * 60000;
    setPhase('running');
  };

  const reset = () => {
    setPhase('setup');
    setIdx(0);
    setSummary(null);
  };

  const current = items[idx];
  const remaining = phase === 'running' && current ? Math.max(0, itemEndAt.current - now) : 0;
  const elapsed = phase === 'running' ? now - meetingStart.current : 0;
  const itemPlanned = current ? current.minutes * 60000 : 1;

  return (
    <Page title="Meeting Timer" subtitle="Run meetings on time — one countdown per agenda item.">
      {phase === 'setup' && (
        <Card title="Agenda" subtitle="Each item gets its own countdown." actions={
          <Btn variant="ghost" size="sm" icon={<Plus size={15} />}
            onClick={() => setItems((p) => [...p, { id: nid(), title: '', minutes: 10 }])}>Add item</Btn>
        }>
          {items.length === 0 && (
            <EmptyState icon={<ListChecks size={28} />} title="No agenda items"
              text="Add agenda items with their time allocation to begin." />
          )}
          {items.map((it, i) => (
            <div className="agenda-row" key={it.id}>
              <Field label={i === 0 ? 'Agenda item' : undefined}>
                <TextInput value={it.title} placeholder="e.g. Sprint review" maxLength={80}
                  onChange={(e) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)))}
                  aria-label={`Agenda item ${i + 1} title`} />
              </Field>
              <Field label={i === 0 ? 'Minutes' : undefined}>
                <NumberInput value={String(it.minutes)} placeholder="10"
                  onChange={(e) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, minutes: Number(e.target.value) || 0 } : x)))}
                  aria-label={`Agenda item ${i + 1} minutes`} />
              </Field>
              <div>
                <IconBtn label={`Remove agenda item ${i + 1}`}
                  onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </div>
          ))}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Btn variant="primary" icon={<Play size={16} />} onClick={start}>Start meeting</Btn>
          </div>
          {plannedTotal > 0 && (
            <p className="muted small" style={{ marginTop: 10 }}>Planned total: {minToHM(plannedTotal / 60000)}</p>
          )}
        </Card>
      )}

      {phase === 'running' && current && (
        <Card title={`Item ${idx + 1} of ${items.length}: ${current.title}`}>
          <div className="timer-display" role="timer" aria-live="off">{fmtDuration(remaining)}</div>
          <p className="timer-sub">of {minToHM(current.minutes)} planned • elapsed {fmtDuration(elapsed)}</p>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={itemPlanned - remaining} max={itemPlanned} />
          </div>
          <div className="btn-row" style={{ marginTop: 18, justifyContent: 'center' }}>
            <Btn variant="secondary" icon={<SkipBack size={16} />} onClick={() => goTo(idx - 1)} disabled={idx === 0}>Previous</Btn>
            <Btn variant="primary" icon={<SkipForward size={16} />} onClick={() => goTo(idx + 1)}>
              {idx + 1 >= items.length ? 'Finish' : 'Next item'}
            </Btn>
            <Btn variant="ghost" icon={<Square size={16} />} onClick={finish}>End meeting</Btn>
          </div>
          <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>
            Up next: {items[idx + 1] ? items[idx + 1].title : '—'}
          </p>
        </Card>
      )}

      {phase === 'done' && summary && (
        <Card title="Meeting finished">
          <div className="result-line"><span>Planned duration</span><strong className="num">{minToHM(summary.planned / 60000)}</strong></div>
          <div className="result-line"><span>Actual duration</span><strong className="num">{fmtDuration(summary.actual)}</strong></div>
          <div className="result-line"><span>Difference</span>
            <strong className="num">{summary.actual <= summary.planned ? `${minToHM((summary.planned - summary.actual) / 60000)} under` : `${minToHM((summary.actual - summary.planned) / 60000)} over`}</strong>
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Btn variant="primary" onClick={reset}>Plan another meeting</Btn>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Efficiency: {fmtNum(summary.planned > 0 ? (summary.planned / Math.max(1, summary.actual)) * 100 : 0, 0)}% of planned time used.
          </p>
        </Card>
      )}
    </Page>
  );
}
