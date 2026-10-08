/* Full calculator with keyboard support and history. */
import React, { useCallback, useEffect, useState } from 'react';
import { Page, Card, Btn } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';

interface HistItem { expr: string; result: string; }

function compute(a: number, b: number, op: string): number | null {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? null : a / b;
    default: return null;
  }
}

function pretty(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  const s = parseFloat(n.toPrecision(10)).toString();
  return s;
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState<HistItem[]>([]);

  const clear = useCallback(() => {
    setDisplay('0'); setAcc(null); setOp(null); setFresh(true);
  }, []);

  const inputDigit = useCallback((dgt: string) => {
    setDisplay((prev) => {
      if (fresh) { setFresh(false); return dgt === '.' ? '0.' : dgt; }
      if (dgt === '.' && prev.includes('.')) return prev;
      const next = prev === '0' && dgt !== '.' ? dgt : prev + dgt;
      return next.replace('-0', '-').slice(0, 16);
    });
  }, [fresh]);

  const inputOp = useCallback((nextOp: string) => {
    const cur = parseFloat(display);
    if (Number.isNaN(cur)) return;
    if (acc != null && op && !fresh) {
      const r = compute(acc, cur, op);
      if (r == null) { setDisplay('Error'); setAcc(null); setOp(null); setFresh(true); return; }
      setAcc(r);
      setDisplay(pretty(r));
    } else {
      setAcc(cur);
    }
    setOp(nextOp);
    setFresh(true);
  }, [acc, op, fresh, display]);

  const equals = useCallback(() => {
    if (acc == null || !op) return;
    const cur = parseFloat(display);
    if (Number.isNaN(cur)) return;
    const r = compute(acc, cur, op);
    const expr = `${pretty(acc)} ${op} ${pretty(cur)}`;
    if (r == null) {
      setDisplay('Error');
      setHistory((h) => [{ expr, result: 'Cannot divide by zero' }, ...h].slice(0, 30));
    } else {
      const res = pretty(r);
      setDisplay(res);
      setHistory((h) => [{ expr, result: res }, ...h].slice(0, 30));
    }
    setAcc(null); setOp(null); setFresh(true);
  }, [acc, op, display]);

  const toggleSign = useCallback(() => {
    setDisplay((p) => (p.startsWith('-') ? p.slice(1) : p === '0' ? p : '-' + p));
  }, []);

  const percent = useCallback(() => {
    const cur = parseFloat(display);
    if (Number.isNaN(cur)) return;
    setDisplay(pretty(cur / 100));
  }, [display]);

  const backspace = useCallback(() => {
    setDisplay((p) => {
      if (fresh || p.length <= 1 || (p.length === 2 && p.startsWith('-'))) { setFresh(true); return '0'; }
      return p.slice(0, -1);
    });
  }, [fresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) inputDigit(k);
      else if (k === '.') inputDigit('.');
      else if (k === '+') inputOp('+');
      else if (k === '-') inputOp('−');
      else if (k === '*') inputOp('×');
      else if (k === '/') { e.preventDefault(); inputOp('÷'); }
      else if (k === '%') percent();
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
      else if (k === 'Backspace') backspace();
      else if (k === 'Escape') clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputDigit, inputOp, equals, percent, backspace, clear]);

  const key = (label: string, onClick: () => void, variant: 'secondary' | 'primary' | 'ghost' = 'secondary', span = 1) => (
    <button
      key={label}
      onClick={onClick}
      className={`btn btn-${variant}`}
      style={{
        gridColumn: span > 1 ? `span ${span}` : undefined,
        fontSize: 20, padding: '18px 0', borderRadius: 14, minHeight: 60,
      }}
      aria-label={label === '⌫' ? 'Backspace' : label}
    >
      {label}
    </button>
  );

  return (
    <Page title="Calculator" subtitle="Tip: you can type with your keyboard too.">
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'right', marginBottom: 6 }} className="muted small" aria-live="polite">
            {acc != null && op ? `${pretty(acc)} ${op}` : ' '}
          </div>
          <div
            role="status" aria-live="polite"
            style={{
              textAlign: 'right', fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              fontFamily: 'ui-monospace, monospace', overflowX: 'auto', whiteSpace: 'nowrap',
              padding: '8px 4px 16px', color: display === 'Error' ? 'var(--danger, #d92d20)' : 'var(--text)',
            }}
          >
            {display}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {key('C', clear, 'ghost')}
            {key('±', toggleSign, 'ghost')}
            {key('%', percent, 'ghost')}
            {key('÷', () => inputOp('÷'), 'primary')}
            {key('7', () => inputDigit('7'))}
            {key('8', () => inputDigit('8'))}
            {key('9', () => inputDigit('9'))}
            {key('×', () => inputOp('×'), 'primary')}
            {key('4', () => inputDigit('4'))}
            {key('5', () => inputDigit('5'))}
            {key('6', () => inputDigit('6'))}
            {key('−', () => inputOp('−'), 'primary')}
            {key('1', () => inputDigit('1'))}
            {key('2', () => inputDigit('2'))}
            {key('3', () => inputDigit('3'))}
            {key('+', () => inputOp('+'), 'primary')}
            {key('0', () => inputDigit('0'), 'secondary', 2)}
            {key('.', () => inputDigit('.'))}
            {key('=', equals, 'primary')}
          </div>
          <div style={{ marginTop: 10 }}>
            <Btn variant="ghost" size="sm" icon={<DynIcon name="History" size={14} />} onClick={backspace}>⌫ Backspace</Btn>
          </div>
        </Card>

        {history.length > 0 && (
          <Card title="History" actions={<Btn size="sm" variant="ghost" onClick={() => setHistory([])}>Clear</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                  <span className="muted num">{h.expr} =</span>
                  <strong className="num">{h.result}</strong>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
