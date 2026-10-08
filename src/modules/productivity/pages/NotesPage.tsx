/* Notes — create, search, tag, pin. Honors ?new=1 deep link. */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Card, Btn, IconBtn, Field, TextInput, Textarea, Modal,
         ConfirmDialog, EmptyState, Switch, Chip, SearchInput } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { useLive } from '../../../hooks/useLive';
import { db, uid } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { nowISO, timeAgo } from '../../../lib/format';

interface Note { id: string; title: string; body: string; tags: string[]; pinned: boolean; category: string; updatedAt: string; }

const EMPTY = { title: '', body: '', tags: '', category: 'General', pinned: false };

export default function NotesPage() {
  const { data } = useLive(() => db.all<Note>('notes'), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (data || []).forEach((n) => n.tags.forEach((tg) => s.add(tg)));
    return [...s].sort();
  }, [data]);

  const notes = useMemo(() => {
    let list = [...(data || [])];
    if (tagFilter !== 'All') list = list.filter((n) => n.tags.includes(tagFilter));
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((n) => (n.title + ' ' + n.body + ' ' + n.tags.join(' ')).toLowerCase().includes(needle));
    }
    list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [data, q, tagFilter]);

  const set = (k: keyof typeof EMPTY, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim() && !form.body.trim()) { toast.error('Please write something first.'); return; }
    const tags = form.tags.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
    try {
      if (editing) {
        await db.put('notes', { ...editing, title: form.title.trim() || 'Untitled', body: form.body, tags,
          category: form.category.trim() || 'General', pinned: form.pinned, updatedAt: nowISO() });
        toast.success('Note updated.');
      } else {
        await db.add('notes', { id: uid(), title: form.title.trim() || 'Untitled', body: form.body, tags,
          category: form.category.trim() || 'General', pinned: form.pinned, updatedAt: nowISO() });
        toast.success('Note saved.');
      }
      setModalOpen(false);
    } catch { toast.error('Could not save the note.'); }
  };

  const togglePin = async (n: Note) => {
    try { await db.put('notes', { ...n, pinned: !n.pinned, updatedAt: nowISO() }); }
    catch { toast.error('Could not update the note.'); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await db.remove('notes', confirmId); toast.success('Note deleted.'); }
    catch { toast.error('Could not delete the note.'); }
    setConfirmId(null);
  };

  const openEdit = (n: Note) => {
    setEditing(n);
    setForm({ title: n.title, body: n.body, tags: n.tags.join(', '), category: n.category, pinned: n.pinned });
    setModalOpen(true);
  };

  return (
    <Page
      title="Notes"
      subtitle="Capture ideas, lists and reminders."
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>New note</Btn>}
    >
      <Card>
        <div style={{ marginBottom: 12 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search notes…" />
        </div>
        {allTags.length > 0 && (
          <div className="chip-row" style={{ marginBottom: 4 }}>
            <Chip active={tagFilter === 'All'} onClick={() => setTagFilter('All')}>All</Chip>
            {allTags.map((tg) => (
              <Chip key={tg} active={tagFilter === tg} onClick={() => setTagFilter(tg)}>#{tg}</Chip>
            ))}
          </div>
        )}

        {notes.length === 0 ? (
          <EmptyState
            icon={<DynIcon name="StickyNote" size={40} />}
            title={data && data.length > 0 ? 'No matching notes' : 'No notes yet'}
            text="Jot down anything — ideas, shopping reminders, meeting points."
            action={data && data.length > 0 ? undefined : <Btn variant="primary" onClick={openNew}>Write your first note</Btn>}
          />
        ) : (
          <div className="grid cols-3">
            {notes.map((n) => (
              <div key={n.id} className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                    <div className="muted small">{n.category} • {timeAgo(n.updatedAt)}</div>
                  </div>
                  <IconBtn label={n.pinned ? 'Unpin' : 'Pin'} onClick={() => togglePin(n)}>
                    <DynIcon name="Star" size={16} {...(n.pinned ? { fill: 'var(--gold)', color: 'var(--gold)' } : {})} />
                  </IconBtn>
                </div>
                {n.body && (
                  <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                    {n.body}
                  </p>
                )}
                {n.tags.length > 0 && (
                  <div className="chip-row" style={{ marginTop: 8 }}>
                    {n.tags.map((tg) => <span key={tg} className="chip" style={{ cursor: 'default' }}>#{tg}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <Btn size="sm" variant="secondary" icon={<DynIcon name="Pencil" size={14} />} onClick={() => openEdit(n)}>Edit</Btn>
                  <Btn size="sm" variant="ghost" icon={<DynIcon name="Trash2" size={14} />} onClick={() => setConfirmId(n.id)}>Delete</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit note' : 'New note'} wide
        actions={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>{editing ? 'Save changes' : 'Save note'}</Btn>
          </>
        }
      >
        <Field label="Title">
          <TextInput value={form.title} placeholder="Note title" onChange={(e) => set('title', e.target.value)} autoFocus />
        </Field>
        <Field label="Body">
          <Textarea rows={8} value={form.body} placeholder="Write your note…" onChange={(e) => set('body', e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Tags" hint="Comma separated">
            <TextInput value={form.tags} placeholder="work, ideas" onChange={(e) => set('tags', e.target.value)} />
          </Field>
          <Field label="Category">
            <TextInput value={form.category} placeholder="General" onChange={(e) => set('category', e.target.value)} />
          </Field>
        </div>
        <Switch label="Pin this note" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} />
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Delete note?" message="This note will be permanently deleted."
        onConfirm={remove} onCancel={() => setConfirmId(null)} />
    </Page>
  );
}
