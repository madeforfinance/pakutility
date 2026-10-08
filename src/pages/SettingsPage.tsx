import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, ShieldCheck, Bell } from 'lucide-react';
import { Page, Card, Field, Select, TextInput, NumberInput, Switch, Segmented, Btn, Modal, ConfirmDialog, EmptyState } from '../components/ui';
import { useSettings } from '../app/settings';
import { db, STORES } from '../storage/db';
import { PRAYER_METHODS } from '../lib/islamic';
import { toast } from '../lib/toast';
import taxData from '../data/tax/2026-27.json';

const ACCENTS = [
  { v: 'gold', label: 'Gold', c: '#D4AF37' },
  { v: 'navy', label: 'Navy', c: '#4d7cfe' },
  { v: 'green', label: 'Green', c: '#34b37a' },
  { v: 'teal', label: 'Teal', c: '#2bb3a3' },
];

export default function SettingsPage() {
  const { prefs, update } = useSettings();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (p: any) => update(p);

  const doExport = async () => {
    try {
      const data = await db.exportAll();
      const payload = { app: 'pakutility', version: 1, exportedAt: new Date().toISOString(), data };
      const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
      const d = new Date();
      const name = `pakutility-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast.success('Backup exported');
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  const doImport = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const data = parsed.data || parsed;
      const valid = data && typeof data === 'object' && STORES.some((s) => Array.isArray((data as any)[s]));
      if (!valid) {
        toast.error('This file is not a valid PakUtility backup.');
        return;
      }
      await db.importAll(data, importMode);
      setImportFile(null);
      toast.success(importMode === 'replace' ? 'Backup restored (replaced)' : 'Backup merged');
    } catch {
      toast.error('Could not read that file.');
    }
  };

  const doDeleteAll = async () => {
    for (const s of STORES) {
      if (s === 'settings') continue;
      await db.clear(s);
    }
    setConfirmDelete(false);
    toast.success('All data deleted');
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      set({ notifications: true });
      toast.success('Notifications enabled');
    } else {
      toast.error('Notification permission was denied.');
    }
  };

  return (
    <Page title="Settings" subtitle="Appearance, preferences, data and privacy.">
      <div className="grid cols-2">
        <Card title="Appearance">
          <Field label="Theme">
            <Segmented
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
              value={prefs.theme}
              onChange={(v) => set({ theme: v })}
            />
          </Field>
          <Field label="Accent color">
            <div className="chip-row">
              {ACCENTS.map((a) => (
                <button key={a.v} className={`chip${prefs.accent === a.v ? ' active' : ''}`} onClick={() => set({ accent: a.v })}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: a.c, marginRight: 6 }} />
                  {a.label}
                </button>
              ))}
            </div>
          </Field>
        </Card>

        <Card title="General">
          <div className="form-row">
            <Field label="Currency symbol">
              <TextInput value={prefs.currency} onChange={(e) => set({ currency: e.target.value })} maxLength={6} />
            </Field>
            <Field label="Currency code">
              <TextInput value={prefs.currencyCode} onChange={(e) => set({ currencyCode: e.target.value.toUpperCase() })} maxLength={5} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Date format">
              <Select value={prefs.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as any })}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Select>
            </Field>
            <Field label="First day of week">
              <Select value={String(prefs.firstDayOfWeek)} onChange={(e) => set({ firstDayOfWeek: Number(e.target.value) as any })}>
                <option value="1">Monday</option>
                <option value="0">Sunday</option>
                <option value="6">Saturday</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Finance">
          <div className="form-row">
            <Field label="Tax year" hint="Used by Pakistan tax calculators.">
              <Select value={prefs.taxYear} onChange={(e) => set({ taxYear: e.target.value })}>
                {(taxData as any).taxYear ? <option value={(taxData as any).taxYear}>{(taxData as any).taxYear}</option> : null}
                <option value="2025-26">2025-26</option>
              </Select>
            </Field>
            <Field label="Default fuel price (per litre)">
              <NumberInput value={String(prefs.fuelPrice)} onChange={(e) => set({ fuelPrice: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Default mileage (km per litre)">
            <NumberInput value={String(prefs.mileage)} onChange={(e) => set({ mileage: Number(e.target.value) || 0 })} />
          </Field>
          <h4 style={{ margin: '14px 0 8px' }}>Business profile <span className="muted small">(used on invoices & letters)</span></h4>
          <Field label="Business / your name">
            <TextInput value={prefs.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="e.g. Ahmed Traders" />
          </Field>
          <div className="form-row">
            <Field label="Phone">
              <TextInput value={prefs.businessPhone} onChange={(e) => set({ businessPhone: e.target.value })} placeholder="03xx xxxxxxx" />
            </Field>
            <Field label="Email">
              <TextInput value={prefs.businessEmail} onChange={(e) => set({ businessEmail: e.target.value })} placeholder="you@example.com" />
            </Field>
          </div>
          <Field label="Address">
            <TextInput value={prefs.businessAddress} onChange={(e) => set({ businessAddress: e.target.value })} placeholder="Shop, street, city" />
          </Field>
        </Card>

        <Card title="Islamic">
          <Field label="Prayer time method" hint="Calculation method for prayer times.">
            <Select value={prefs.prayerMethod} onChange={(e) => set({ prayerMethod: e.target.value })}>
              {Object.entries(PRAYER_METHODS).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hijri date adjustment (days)" hint="Shift Hijri dates ± to match local moon sighting.">
            <Select value={String(prefs.hijriAdjustment || 0)} onChange={(e) => set({ hijriAdjustment: Number(e.target.value) })}>
              <option value="-2">−2 days</option>
              <option value="-1">−1 day</option>
              <option value="0">No adjustment</option>
              <option value="1">+1 day</option>
              <option value="2">+2 days</option>
            </Select>
          </Field>
        </Card>

        <Card title="Notifications">
          <Switch label="Enable reminders & notifications" checked={!!prefs.notifications}
            onChange={(e) => { if (e.target.checked) enableNotifications(); else set({ notifications: false }); }} />
          <p className="muted small">
            Browser notifications only — no external service. If unavailable, reminders still appear in the app.
          </p>
          <Btn variant="secondary" size="sm" icon={<Bell size={16} />} onClick={enableNotifications}>
            Request permission
          </Btn>
        </Card>

        <Card title="Data & backup" >
          <div id="data" />
          <p className="muted small" style={{ marginTop: 0 }}>
            Everything is stored locally on this device (IndexedDB). Export regularly to keep a backup.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Btn variant="primary" size="sm" icon={<Download size={16} />} onClick={doExport}>Export backup</Btn>
            <Btn variant="secondary" size="sm" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Import backup</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
              onChange={(e) => { setImportFile(e.target.files?.[0] || null); e.target.value = ''; }} />
          </div>
          <Btn variant="danger" size="sm" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>
            Delete all data
          </Btn>
        </Card>

        <Card title="Privacy">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldCheck size={22} style={{ color: 'var(--success)', flex: '0 0 22px', marginTop: 2 }} />
            <div className="small">
              <p style={{ margin: '0 0 8px' }}><b>Your data stays with you.</b></p>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
                <li>No account, no sign-in, no cloud sync.</li>
                <li>No analytics, no ads, no trackers.</li>
                <li>All calculations happen on your device.</li>
                <li>You can export or wipe your data anytime.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card title="About">
          <div className="kv"><span className="k">App</span><span className="v">PakUtility</span></div>
          <div className="kv"><span className="k">Tagline</span><span className="v">Everyday tools. One place.</span></div>
          <div className="kv"><span className="k">Version</span><span className="v">1.0.0</span></div>
          <div className="kv"><span className="k">Developed by</span><span className="v">ASNA Consultancy</span></div>
          <div className="kv"><span className="k">Cost</span><span className="v">$0 — free forever, works offline</span></div>
        </Card>
      </div>

      <Modal open={!!importFile} onClose={() => setImportFile(null)} title="Import backup"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setImportFile(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={doImport}>Import</Btn>
          </>
        }>
        <p className="small">File: <b>{importFile?.name}</b></p>
        <Field label="How should existing data be handled?">
          <Segmented
            options={[{ value: 'merge', label: 'Merge' }, { value: 'replace', label: 'Replace all' }]}
            value={importMode}
            onChange={setImportMode}
          />
        </Field>
        <p className="muted small">
          {importMode === 'merge'
            ? 'Backup records are added alongside your current data. Records with the same ID are updated.'
            : 'All current data is cleared first, then the backup is restored.'}
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete all data?"
        message="This permanently deletes every transaction, note, task, customer, document and setting stored on this device. This cannot be undone. Export a backup first if you might need it."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDeleteAll}
      />
    </Page>
  );
}

export function SettingsEmpty() {
  return <EmptyState icon={<Download size={30} />} title="Settings" text="" />;
}
