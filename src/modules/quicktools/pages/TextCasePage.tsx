/* Text case converter — UPPER, lower, Title, Sentence, aLtErNaTiNg. */
import React, { useState } from 'react';
import { Page, Card, Field, Textarea, Btn } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';

function toTitle(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-–—(["'])[a-z\u00E0-\u024F]/g, (m) => m.toUpperCase());
}
function toSentence(s: string): string {
  return s.toLowerCase().replace(/(^\s*[a-z\u00E0-\u024F])|([.!?…]\s+[a-z\u00E0-\u024F])/g, (m) => m.toUpperCase());
}
function toAlternating(s: string): string {
  let upper = true;
  return s.split('').map((ch) => {
    if (!/[a-zA-Z]/.test(ch)) return ch;
    const out = upper ? ch.toUpperCase() : ch.toLowerCase();
    upper = !upper;
    return out;
  }).join('');
}

const CASES = [
  { id: 'upper', label: 'UPPER CASE', fn: (s: string) => s.toUpperCase() },
  { id: 'lower', label: 'lower case', fn: (s: string) => s.toLowerCase() },
  { id: 'title', label: 'Title Case', fn: toTitle },
  { id: 'sentence', label: 'Sentence case', fn: toSentence },
  { id: 'alt', label: 'aLtErNaTiNg cAsE', fn: toAlternating },
];

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
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

export default function TextCasePage() {
  const [text, setText] = useState('');

  const apply = (fn: (s: string) => string) => setText((t) => fn(t));

  const copy = async () => {
    if (!text) { toast.error('Nothing to copy yet.'); return; }
    const ok = await copyText(text);
    if (ok) toast.success('Copied to clipboard.');
    else toast.error('Copy failed — please select and copy manually.');
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <Page title="Text Case Converter" subtitle="Change capitalization in one tap.">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Card>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {CASES.map((c) => (
              <Btn key={c.id} size="sm" variant="secondary" onClick={() => apply(c.fn)}>{c.label}</Btn>
            ))}
          </div>
          <Field label="Your text">
            <Textarea rows={10} value={text} placeholder="Type or paste text here, then pick a case above…"
              onChange={(e) => setText(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn variant="secondary" icon={<DynIcon name="Copy" size={14} />} onClick={copy}>Copy</Btn>
            <Btn variant="ghost" icon={<DynIcon name="Trash2" size={14} />} onClick={() => setText('')}>Clear</Btn>
            <span className="muted small" style={{ marginLeft: 'auto' }}>
              {words} word{words === 1 ? '' : 's'} • {text.length} characters
            </span>
          </div>
        </Card>
      </div>
    </Page>
  );
}
