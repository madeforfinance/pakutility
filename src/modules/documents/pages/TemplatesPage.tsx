/* Gallery of 15 professional document templates. */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Btn } from '../../../components/ui';
import { DynIcon } from '../../../components/DynIcon';
import { TEMPLATES } from '../lib/templates';

export default function TemplatesPage() {
  const nav = useNavigate();
  return (
    <Page
      title="Document Templates"
      subtitle="Fill in the details, preview instantly, then print or download a PDF."
    >
      <div className="grid cols-3" style={{ marginTop: 4 }}>
        {TEMPLATES.map((tpl) => (
          <Card key={tpl.id}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className="qa-ic" style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--navy), var(--navy-3))', color: '#fff',
              }}>
                <DynIcon name={tpl.icon} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{tpl.title}</h3>
                <p className="muted small" style={{ margin: '0 0 12px' }}>{tpl.description}</p>
                <Btn size="sm" onClick={() => nav(`/documents/templates/${tpl.id}`)}>
                  Use template
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
