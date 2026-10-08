/* Lightweight synchronous preferences snapshot used by formatters.
   The SettingsProvider keeps this in sync with IndexedDB. */

export interface Prefs {
  currency: string; // e.g. 'Rs.'
  currencyCode: string; // e.g. 'PKR'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  numberFormat: 'en-PK' | 'en-US';
  firstDayOfWeek: 0 | 1 | 6; // 0=Sun 1=Mon 6=Sat
  theme: 'light' | 'dark' | 'system';
  accent: 'gold' | 'navy' | 'green' | 'teal';
  taxYear: string;
  prayerMethod: string;
  hijriAdjustment: number;
  fuelPrice: number;
  mileage: number;
  defaultVehicleId: string;
  exchangeRates: Record<string, number>; // per 1 PKR
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessEmail: string;
  notifications: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  currency: 'Rs.',
  currencyCode: 'PKR',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'en-PK',
  firstDayOfWeek: 1,
  theme: 'system',
  accent: 'gold',
  taxYear: '2026-27',
  prayerMethod: 'karachi',
  hijriAdjustment: 0,
  fuelPrice: 260,
  mileage: 12,
  defaultVehicleId: '',
  exchangeRates: { USD: 278, EUR: 302, GBP: 352, AED: 75.7, SAR: 74.1 },
  businessName: '',
  businessPhone: '',
  businessAddress: '',
  businessEmail: '',
  notifications: false,
};

export const prefs: Prefs = { ...DEFAULT_PREFS };

export function setPrefs(p: Partial<Prefs>) {
  Object.assign(prefs, p);
}
