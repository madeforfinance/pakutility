/* Word / character counter with live stats and reading time. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Field, Textarea, Btn, Stat } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { fmtInt } from '../../../lib/format';

export default function WordCounterPage() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? text.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean).length : 0;
    const paragraphs = text.trim() ? text.split(/\n+/).map((s) => s.trim()).filter(Boolean).length : 0;
    const wpm = 200;
    const totalSec = Math.round((words / wpm) * 60);
    const reading = words === 0 ? '—' : totalSec < 60 ? 'Less than a minute' : `${Math.floor(totalSec / 60)} min ${totalSec % 60} sec`;
    return { words, chars, charsNoSpaces, sentences, paragraphs, reading };
  }, [text]);

  return (
    <Page title="Word Counter" subtitle="Live counts as you type or paste.">
      <div className="grid cols-3" style={{ maxWidth: 720, margin: '0 auto 4px' }}>
        <Stat label="Words" value={fmtInt(stats.words)} icon={<DynIcon name="Hash" size={20} />} tone="navy" />
        <Stat label="Characters" value={fmtInt(stats.chars)} icon={<DynIcon name="Type" size={20} />} tone="gold" />
        <Stat label="No spaces" value={fmtInt(stats.charsNoSpaces)} icon={<DynIcon name="Sigma" size={20} />} tone="blue" />
        <Stat label="Sentences" value={fmtInt(stats.sentences)} icon={<DynIcon name="BookOpen" size={20} />} tone="green" />
        <Stat label="Paragraphs" value={fmtInt(stats.paragraphs)} icon={<DynIcon name="ClipboardList" size={20} />} tone="navy" />
        <Stat label="Reading time" value={stats.reading} icon={<DynIcon name="Clock" size={20} />} tone="gold" />
      </div>
      <Card actions={<Btn size="sm" variant="ghost" onClick={() => setText('')}>Clear</Btn>}>
        <Field label="Your text">
          <Textarea rows={12} value={text} placeholder="Type or paste your text here…" onChange={(e) => setText(e.target.value)} />
        </Field>
      </Card>
    </Page>
  );
}
