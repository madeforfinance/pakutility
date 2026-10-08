import React from 'react';
import { Page, Card, Field, Select } from '../../../components/ui';
import { ToolCard } from '../../../components/ToolCard';
import { useSettings } from '../../../app/settings';
import { TAX_TOOLS, PAGE_TOOLS } from '../lib/toolDefs';
import { TAX_YEAR } from '../lib/tax';
import { TaxDisclaimer } from '../components/TaxDisclaimer';

const AVAILABLE_YEARS = ['2026-27'];

export default function TaxHubPage() {
  const { prefs, update } = useSettings();
  const zakat = PAGE_TOOLS.find((t) => t.id === 'zakat-calculator')!;

  return (
    <Page title="Pakistan Tax" subtitle={`FBR tax calculators for tax year ${TAX_YEAR}.`}>
      <div className="grid cols-2">
        <div>
          <Card title="Tax year">
            <Field label="Active tax year" hint="Slabs are loaded from the local dataset for the selected year.">
              <Select
                value={AVAILABLE_YEARS.includes(prefs.taxYear) ? prefs.taxYear : AVAILABLE_YEARS[0]}
                onChange={(e) => update({ taxYear: e.target.value })}
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </Card>
          <div style={{ marginTop: 16 }}>
            <TaxDisclaimer />
          </div>
        </div>
        <div>
          <div className="tool-grid">
            {TAX_TOOLS.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
            <ToolCard tool={zakat} />
          </div>
        </div>
      </div>
    </Page>
  );
}
