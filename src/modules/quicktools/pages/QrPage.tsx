/* QR code generator — text → QR image, size select, PNG download. */
import React, { useState } from 'react';
import { Page, Card, Field, Textarea, Select, Btn, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { toDataURL } from 'qrcode';

export default function QrPage() {
  const [text, setText] = useState('');
  const [size, setSize] = useState('512');
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    const t = text.trim();
    if (!t) { toast.error('Please enter some text or a link first.'); return; }
    setBusy(true);
    try {
      const url = await toDataURL(t, { width: Number(size), margin: 2, errorCorrectionLevel: 'M' });
      setImg(url);
    } catch {
      toast.error('Could not generate the QR code. Try shorter text.');
      setImg(null);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `pakutility-qr-${size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('QR code downloaded.');
  };

  return (
    <Page title="QR Code Generator" subtitle="Turn text, links or contact details into a scannable QR code.">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Card>
          <Field label="Text or link">
            <Textarea rows={3} value={text} placeholder="e.g. https://example.com or your phone number"
              onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field label="Image size">
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="256">256 × 256</option>
              <option value="512">512 × 512</option>
              <option value="1024">1024 × 1024</option>
            </Select>
          </Field>
          <Btn variant="primary" block icon={<DynIcon name="QrCode" size={16} />} onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate QR code'}
          </Btn>
        </Card>

        {img ? (
          <Card title="Your QR code" actions={<Btn size="sm" variant="secondary" icon={<DynIcon name="Download" size={14} />} onClick={download}>Download PNG</Btn>}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <img src={img} alt="Generated QR code" style={{ maxWidth: '100%', height: 'auto', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
          </Card>
        ) : (
          <EmptyState icon={<DynIcon name="QrCode" size={40} />} title="No QR code yet"
            text="Enter text above and press Generate. Works fully offline." />
        )}
      </div>
    </Page>
  );
}
