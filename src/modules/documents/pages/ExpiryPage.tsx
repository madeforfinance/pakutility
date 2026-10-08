/* Document expiry tracker — CNIC, passport, licences, insurance, subscriptions. */
import React, { useMemo, useState } from 'react';
import { Page, Card, Btn, IconBtn, Field, TextInput, Select, Textarea, Modal,
         ConfirmDialog, EmptyState, Stat, Badge, Chip, SearchInput } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { useLive } from '../../../hooks/useLive';
import { db, uid } from '../../../storage/db';
import { toast } from '../../../lib/toast';
import { fmtDate, daysUntil, todayISO } from '../../../lib/format';

const KINDS = ['CNIC', 'Passport', 'Driving Licence', 'Vehicle Registration', 'Insurance', 'Certificate', 'Membership', 'Subscription', 'Custom'];

interface DocRec {
  id: string; title: string; kind: string; number: string;
  issueDate: string; expiryDate: string; note: string;
}

type Status = 'expired' | 'soon' | 'valid' | 'nodate';

function statusOf(r: DocRec): { s: Status; days: number | null } {
  if (!r.expiryDate) return { s: 'nodate', days: null };
  const days = daysUntil(r.expiryDate);
  if (days == null) return { s: 'nodate', days: null };
  if (days < 0) return { s: 'expired', days };
  if (days <= 60) return { s: 'soon', days };
  return { s: 'valid', days };
}

const EMPTY: Omit<DocRec, 'id'> = { title: '', kind: 'CNIC', number: '', issueDate: '', expiryDate: '', note: '' };

export default function ExpiryPage() {
  const { data } = useLive(() => db.all<DocRec>('documents'), []);
  const docs = useMemo(() => {
    const list = [...(data || [])];
    list.sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
    return list;
  }, [data]);

  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocRec | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const counts = useMemo(() => {
    let expired = 0, soon = 0, valid = 0;
    for (const r of docs) {
      const { s } = statusOf(r);
      if (s === 'expired') expired++;
      else if (s === 'soon') soon++;
      else if (s === 'valid') valid++;
    }
    return { expired, soon, valid, total: docs.length };
  }, [docs]);

  const filtered = docs.filter((r) => {
    if (kindFilter !== 'All' && r.kind !== kindFilter) return false;
    if (q && !(r.title + ' ' + r.number + ' ' + r.note).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (r: DocRec) => { setEditing(r); setForm({ ...r }); setModalOpen(true); };
  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { toast.error('Please enter a document title.'); return; }
    try {
      if (editing) {
        await db.put('documents', { ...editing, ...form, title: form.title.trim() });
        toast.success('Document updated.');
      } else {
        await db.add('documents', { ...form, id: uid(), title: form.title.trim() });
        toast.success('Document added.');
      }
      setModalOpen(false);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  };

  const remove = async () => {
    if (!confirmId) return;
    try {
      await db.remove('documents', confirmId);
      toast.success('Document deleted.');
    } catch {
      toast.error('Could not delete. Please try again.');
    }
    setConfirmId(null);
  };

  return (
    <Page
      title="Document Expiry Tracker"
      subtitle="Never miss a CNIC, passport, licence or insurance renewal."
      actions={<Btn variant="primary" icon={<DynIcon name="Plus" size={16} />} onClick={openNew}>Add document</Btn>}
    >
      <div className="grid cols-4" style={{ marginBottom: 4 }}>
        <Stat label="Tracked" value={String(counts.total)} icon={<DynIcon name="IdCard" size={20} />} tone="navy" />
        <Stat label="Valid" value={String(counts.valid)} icon={<DynIcon name="CircleCheck" size={20} />} tone="green" />
        <Stat label="Expiring soon" value={String(counts.soon)} icon={<DynIcon name="TriangleAlert" size={20} />} tone="gold" />
        <Stat label="Expired" value={String(counts.expired)} icon={<DynIcon name="FileWarning" size={20} />} tone="red" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: '1 1 220px' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search documents…" />
          </div>
        </div>
        <div className="chip-row" style={{ marginBottom: 6 }}>
          {['All', ...KINDS].map((k) => (
            <Chip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>{k}</Chip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<DynIcon name="IdCard" size={40} />}
            title={docs.length === 0 ? 'No documents tracked yet' : 'No matching documents'}
            text="Add your CNIC, passport, driving licence, insurance and subscriptions to get renewal reminders."
            action={docs.length === 0 ? <Btn variant="primary" onClick={openNew}>Add your first document</Btn> : undefined}
          />
        ) : (
          <div className="grid cols-2">
            {filtered.map((r) => {
              const { s, days } = statusOf(r);
              const tone = s === 'expired' ? 'red' : s === 'soon' ? 'amber' : s === 'valid' ? 'green' : 'gray';
              const label = s === 'expired'
                ? `Expired ${Math.abs(days || 0)}d ago`
                : s === 'soon' ? `${days}d left` : s === 'valid' ? `${days}d left` : 'No expiry date';
              return (
                <div key={r.id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{r.title}</div>
                      <div className="muted small">{r.kind}{r.number ? ` • ${r.number}` : ''}</div>
                    </div>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <div className="muted small" style={{ marginTop: 8 }}>
                    {r.issueDate ? `Issued ${fmtDate(r.issueDate)}` : ''}
                    {r.issueDate && r.expiryDate ? '  •  ' : ''}
                    {r.expiryDate ? `Expires ${fmtDate(r.expiryDate)}` : ''}
                    {r.note ? `  •  ${r.note}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <Btn size="sm" variant="secondary" icon={<DynIcon name="Pencil" size={14} />} onClick={() => openEdit(r)}>Edit</Btn>
                    <Btn size="sm" variant="ghost" icon={<DynIcon name="Trash2" size={14} />} onClick={() => setConfirmId(r.id)}>Delete</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit document' : 'Add document'}
        actions={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}>{editing ? 'Save changes' : 'Add document'}</Btn>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Title" required>
            <TextInput value={form.title} placeholder="e.g. My CNIC" onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Document number">
            <TextInput value={form.number} placeholder="e.g. 35202-1234567-1" onChange={(e) => set('number', e.target.value)} />
          </Field>
          <Field label="Issue date">
            <TextInput type="date" value={form.issueDate} max={todayISO()} onChange={(e) => set('issueDate', e.target.value)} />
          </Field>
          <Field label="Expiry date">
            <TextInput type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
          </Field>
          <Field label="Note">
            <Textarea rows={2} value={form.note} placeholder="Optional note" onChange={(e) => set('note', e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete document?"
        message="This document record will be permanently deleted."
        onConfirm={remove}
        onCancel={() => setConfirmId(null)}
      />
    </Page>
  );
}
