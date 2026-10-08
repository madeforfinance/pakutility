import React, { useMemo, useState } from 'react';
import { Page, Card, Field, NumberInput, Select } from '../../../components/ui';
import { fmtMoney, fmtPct, parseAmount } from '../../../lib/format';
import { WITHHOLDING_SECTIONS, computeWithholding } from '../lib/tax';
import { TaxDisclaimer } from '../components/TaxDisclaimer';

export default function WithholdingPage() {
  const [sectionIdx, setSectionIdx] = useState(1);
  const section = WITHHOLDING_SECTIONS[sectionIdx];
  const [amountRaw, setAmountRaw] = useState('100000');
  const [rateRaw, setRateRaw] = useState(String(section.rate * 100));

  const pickSection = (i: number) => {
    setSectionIdx(i);
    setRateRaw(String(WITHHOLDING_SECTIONS[i].rate * 100));
  };

  const { amountError, rateError, wht } = useMemo(() => {
    const amount = parseAmount(amountRaw);
    if (amount === null || amount < 0)
      return { amountError: 'Please enter a valid amount.', rateError: '', wht: null as number | null };
    const rate = parseAmount(rateRaw);
    if (rate === null || rate < 0)
      return { amountError: '', rateError: 'Please enter a valid rate.', wht: null as number | null };
    return { amountError: '', rateError: '', wht: computeWithholding(amount, rate) };
  }, [amountRaw, rateRaw]);

  return (
    <Page title="Withholding Tax Calculator" subtitle="Advance / withholding tax by FBR section.">
      <div className="grid cols-2">
        <div>
          <Card title="Withholding details">
            <div className="grid">
              <Field label="FBR section" hint={section.note} required>
                <Select value={sectionIdx} onChange={(e) => pickSection(Number(e.target.value))}>
                  {WITHHOLDING_SECTIONS.map((s, i) => (
                    <option key={s.section} value={i}>
                      Sec {s.section} — {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount" error={amountError} required>
                <NumberInput value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} placeholder="e.g. 100000" />
              </Field>
              <Field label="WHT rate (%)" error={rateError} hint="Adjust if your case differs (filer / non-filer)." required>
                <NumberInput value={rateRaw} onChange={(e) => setRateRaw(e.target.value)} placeholder="e.g. 15" />
              </Field>
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <TaxDisclaimer />
          </div>
        </div>
        <div className="result-panel" aria-live="polite">
          <div className="rp-label">Withholding tax · Sec {section.section}</div>
          {wht !== null ? (
            <>
              <div className="rp-value num">{fmtMoney(wht)}</div>
              <div className="kv"><span className="k">Rate applied</span><span className="v num">{fmtPct(parseAmount(rateRaw) ?? 0, 2)}</span></div>
              <div className="kv"><span className="k">Amount after WHT</span><span className="v num">{fmtMoney((parseAmount(amountRaw) ?? 0) - wht)}</span></div>
            </>
          ) : (
            <p style={{ color: '#b9c4d8', margin: 0 }}>Enter valid values to see the result.</p>
          )}
        </div>
      </div>
    </Page>
  );
}
