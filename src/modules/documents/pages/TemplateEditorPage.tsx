/* Template editor: fill fields → live preview → print / PDF. */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, Card, Btn, Field, TextInput, Textarea, EmptyState } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { toast } from '../../../lib/toast';
import { prefs } from '../../../lib/prefs';
import { createPdf, pdfText } from '../../../lib/pdf';
import { getTemplate } from '../lib/templates';

const LEGAL_DISCLAIMER =
  'Disclaimer: This is a general template and not legal advice. Please consult a qualified professional for your specific situation.';

export default function TemplateEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const tpl = id ? getTemplate(id) : undefined;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    tpl?.fields.forEach((f) => {
      init[f.key] = f.def || '';
    });
    return init;
  });

  // Reset the form if the user navigates directly from one template to another
  useEffect(() => {
    const init: Record<string, string> = {};
    tpl?.fields.forEach((f) => {
      init[f.key] = f.def || '';
    });
    setValues(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const body = useMemo(() => (tpl ? tpl.body(values) : ''), [tpl, values]);

  if (!tpl) {
    return (
      <Page title="Template not found">
        <EmptyState
          icon={<DynIcon name="FileText" size={40} />}
          title="Template not found"
          text="The requested document template does not exist."
          action={<Btn onClick={() => nav('/documents/templates')}>Back to templates</Btn>}
        />
      </Page>
    );
  }

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const handlePrint = () => window.print();

  const handlePdf = async () => {
    try {
      await createPdf(
        `${tpl.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
        tpl.title,
        (p) => {
          const paras = body.split('\n');
          for (const para of paras) {
            if (para.trim() === '') {
              p.y += 6;
              continue;
            }
            pdfText(p, para, { size: 10.5 });
          }
          if (tpl.legal) {
            p.y += 10;
            pdfText(p, LEGAL_DISCLAIMER, { size: 8.5, color: [102, 112, 133] });
          }
        },
      );
      toast.success('PDF downloaded.');
    } catch {
      toast.error('Could not generate the PDF. Please try again.');
    }
  };

  const letterheadName = prefs.businessName;

  return (
    <Page
      title={tpl.title}
      subtitle={tpl.description}
      actions={
        <>
          <Btn variant="ghost" onClick={() => nav('/documents/templates')}>All templates</Btn>
          <Btn variant="secondary" icon={<DynIcon name="Printer" size={16} />} onClick={handlePrint}>Print</Btn>
          <Btn variant="primary" icon={<DynIcon name="Download" size={16} />} onClick={handlePdf}>Download PDF</Btn>
        </>
      }
    >
      <div className="grid cols-2">
        {/* Editor form — hidden when printing */}
        <Card title="Fill in the details" className="no-print">
          <div className="form-grid">
            {tpl.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === 'textarea' ? (
                  <Textarea
                    rows={4}
                    value={values[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <TextInput
                    type={f.type === 'date' ? 'date' : 'text'}
                    value={values[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        </Card>

        {/* Live preview */}
        <Card title="Live preview">
          <div className="letter">
            {letterheadName && (
              <div className="letter-head">
                <div className="letter-org">{letterheadName}</div>
                {(prefs.businessAddress || prefs.businessPhone) && (
                  <div className="letter-sub">
                    {[prefs.businessAddress, prefs.businessPhone, prefs.businessEmail].filter(Boolean).join('  •  ')}
                  </div>
                )}
              </div>
            )}
            <div className="letter-title">{tpl.title}</div>
            <div className="letter-body">
              {body.split('\n').map((line, i) =>
                line.trim() === '' ? <br key={i} /> : <p key={i}>{line}</p>,
              )}
            </div>
            {tpl.legal && <div className="letter-disclaimer">{LEGAL_DISCLAIMER}</div>}
          </div>
        </Card>
      </div>
    </Page>
  );
}
