/* Pakistan tax computation helpers — slabs live in src/data/tax/<year>.json, never hard-coded here. */
import taxData from '../../../data/tax/2026-27.json';
import { fmtMoneyFull } from '../../../lib/format';

interface TaxJson {
  taxYear: string;
  disclaimer: string;
  salarySlabs: TaxSlab[];
  businessIndividualSlabs: TaxSlab[];
  salesTax: { standardRate: number; note: string };
  withholdingSections: { section: string; label: string; rate: number; note: string }[];
  zakat: { rate: number; defaultNisabPKR: number; note: string };
}

export interface TaxSlab {
  from: number;
  to: number | null;
  rate: number;
  base: number;
}

export interface WithholdingSection {
  section: string;
  label: string;
  rate: number;
  note: string;
}

const td = taxData as unknown as TaxJson;

export const TAX_YEAR = td.taxYear;
export const TAX_DISCLAIMER = td.disclaimer;
export const SALES_TAX_RATE = td.salesTax.standardRate;
export const SALES_TAX_NOTE = td.salesTax.note;
export const WITHHOLDING_SECTIONS: WithholdingSection[] = td.withholdingSections;
export const ZAKAT_RATE = td.zakat.rate;
export const ZAKAT_NISAB_DEFAULT = td.zakat.defaultNisabPKR;
export const ZAKAT_NOTE = td.zakat.note;

export function salarySlabs(): TaxSlab[] {
  return td.salarySlabs;
}
export function businessSlabs(): TaxSlab[] {
  return td.businessIndividualSlabs;
}

export interface SlabRow {
  range: string;
  taxable: number;
  rate: number;
  tax: number;
}

export interface SlabTaxResult {
  total: number;
  effective: number; // percent
  rows: SlabRow[];
}

/** Progressive slab tax: marginal tax in each slab = rate × amount falling in that slab. */
export function computeSlabTax(annual: number, slabs: TaxSlab[]): SlabTaxResult {
  const rows: SlabRow[] = [];
  let total = 0;
  for (const s of slabs) {
    if (annual <= s.from) break;
    const upper = s.to == null ? annual : Math.min(annual, s.to);
    const taxable = Math.max(0, upper - s.from);
    const marginal = taxable * s.rate;
    total += marginal;
    rows.push({
      range: `${fmtMoneyFull(s.from)} – ${s.to == null ? 'above' : fmtMoneyFull(s.to)}`,
      taxable,
      rate: s.rate,
      tax: marginal,
    });
  }
  const rounded = Math.max(0, Math.round(total));
  return {
    total: rounded,
    effective: annual > 0 ? (rounded / annual) * 100 : 0,
    rows,
  };
}

/** Withholding tax for a section: amount × rate. */
export function computeWithholding(amount: number, ratePct: number): number {
  return (amount * ratePct) / 100;
}

/** Zakat due on net zakatable assets, if at/above nisab. */
export function computeZakat(netAssets: number, nisab: number): { due: number; aboveNisab: boolean } {
  const aboveNisab = netAssets >= nisab && netAssets > 0;
  return { due: aboveNisab ? netAssets * ZAKAT_RATE : 0, aboveNisab };
}
