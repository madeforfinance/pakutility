/* Password generator — length, character sets, strength meter, copy. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, Switch, Btn, ProgressBar, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
};

function buildPassword(len: number, use: Record<keyof typeof SETS, boolean>): string {
  const pools = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((k) => use[k]).map((k) => SETS[k]);
  if (pools.length === 0) return '';
  const all = pools.join('');
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  // guarantee at least one char from each selected set
  const out: string[] = [];
  pools.forEach((p) => out.push(p[arr[out.length] % p.length]));
  for (let i = out.length; i < len; i++) out.push(all[arr[i] % all.length]);
  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = arr[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

export default function PasswordPage() {
  const [len, setLen] = useState(16);
  const [use, setUse] = useState({ upper: true, lower: true, digits: true, symbols: true });
  const [pwd, setPwd] = useState('');

  const strength = useMemo(() => {
    const poolSize = (use.upper ? 26 : 0) + (use.lower ? 26 : 0) + (use.digits ? 10 : 0) + (use.symbols ? 26 : 0);
    if (!pwd || poolSize === 0) return { bits: 0, label: '—', pct: 0 };
    const bits = Math.round(len * Math.log2(poolSize));
    const label = bits < 40 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Good' : 'Strong';
    return { bits, label, pct: Math.min(100, (bits / 100) * 100) };
  }, [pwd, len, use]);

  const generate = () => {
    if (!use.upper && !use.lower && !use.digits && !use.symbols) {
      toast.error('Select at least one character set.');
      return;
    }
    setPwd(buildPassword(len, use));
  };

  const copy = async () => {
    if (!pwd) return;
    const ok = await copyText(pwd);
    if (ok) toast.success('Password copied to clipboard.');
    else toast.error('Copy failed — please select and copy manually.');
  };

  const toggle = (k: keyof typeof SETS) => setUse((u) => ({ ...u, [k]: !u[k] }));

  return (
    <Page title="Password Generator" subtitle="Strong, random passwords generated on your device.">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card>
          <Field label={`Length: ${len} characters`}>
            <input type="range" min={4} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))}
              style={{ width: '100%' }} aria-label="Password length" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 4 }}>
            <Switch label="Uppercase (A–Z)" checked={use.upper} onChange={() => toggle('upper')} />
            <Switch label="Lowercase (a–z)" checked={use.lower} onChange={() => toggle('lower')} />
            <Switch label="Digits (0–9)" checked={use.digits} onChange={() => toggle('digits')} />
            <Switch label="Symbols (!@#…)" checked={use.symbols} onChange={() => toggle('symbols')} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant="primary" block icon={<DynIcon name="KeyRound" size={16} />} onClick={generate}>
              {pwd ? 'Generate again' : 'Generate password'}
            </Btn>
          </div>
        </Card>

        {pwd ? (
          <Card title="Your password" actions={<Btn size="sm" variant="secondary" icon={<DynIcon name="Copy" size={14} />} onClick={copy}>Copy</Btn>}>
            <div
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, wordBreak: 'break-all',
                padding: '14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}
              aria-live="polite"
            >
              {pwd}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="muted small">Strength: <strong>{strength.label}</strong></span>
                <span className="muted small num">{strength.bits} bits of entropy</span>
              </div>
              <ProgressBar value={strength.pct} />
            </div>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Generated with your device's secure random generator. Nothing is sent anywhere.
            </p>
          </Card>
        ) : (
          <EmptyState icon={<DynIcon name="KeyRound" size={40} />} title="No password yet"
            text="Choose your options and press Generate." />
        )}
      </div>
    </Page>
  );
}
