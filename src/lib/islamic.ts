/* Islamic utilities — pure local computation, no network.
   Hijri conversion uses the tabular (arithmetic) calendar; actual dates in
   Pakistan depend on local moon sighting and may differ by a day. */

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi-ul-Awwal', 'Rabi-us-Sani',
  'Jamad-ul-Awwal', 'Jamad-us-Sani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah',
];

function g2jd(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;
}

export interface HijriDate {
  y: number;
  m: number;
  d: number;
}

/** Gregorian -> Hijri (tabular). adjustment shifts days (user setting). */
export function gregorianToHijri(y: number, m: number, d: number, adjustment = 0): HijriDate {
  let jd = g2jd(y, m, d) + adjustment;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { y: year, m: month, d: day };
}

export function hijriToGregorian(hy: number, hm: number, hd: number): { y: number; m: number; d: number } {
  const jd = Math.floor((11 * hy + 3) / 30) + Math.floor(354 * hy) + Math.floor(30 * hm) - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  // jd -> gregorian
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const d = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const m = j + 2 - 12 * l;
  const y = 100 * (n - 49) + i + l;
  return { y, m, d };
}

export function hijriToday(adjustment = 0): HijriDate {
  const n = new Date();
  return gregorianToHijri(n.getFullYear(), n.getMonth() + 1, n.getDate(), adjustment);
}

export function fmtHijri(h: HijriDate): string {
  return `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y} AH`;
}

/* ---------------- Prayer times (standard astronomical method) ---------------- */

export interface PrayerMethod {
  fajrAngle: number;
  ishaAngle: number; // or minutes if ishaMinutes set
  ishaMinutes?: number;
  maghribMinutes?: number;
}

export const PRAYER_METHODS: Record<string, PrayerMethod & { label: string }> = {
  karachi: { label: 'Univ. of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 },
  mwl: { label: 'Muslim World League', fajrAngle: 18, ishaAngle: 17 },
  isna: { label: 'ISNA (North America)', fajrAngle: 15, ishaAngle: 15 },
  egypt: { label: 'Egyptian General Authority', fajrAngle: 19.5, ishaAngle: 17.5 },
  makkah: { label: 'Umm al-Qura, Makkah', fajrAngle: 18.5, ishaAngle: 0, ishaMinutes: 90, maghribMinutes: 0 },
  jafari: { label: "Ja'fari (Ithna Ashari)", fajrAngle: 16, ishaAngle: 14, maghribMinutes: 0 },
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function sunPosition(jd: number): { decl: number; eqt: number } {
  const d = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d) % 360;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(g * D2R) + 0.02 * Math.sin(2 * g * D2R)) % 360;
  const e = 23.439 - 0.00000036 * d;
  const RA = Math.atan2(Math.cos(e * D2R) * Math.sin(L * D2R), Math.cos(L * D2R)) * R2D;
  const decl = Math.asin(Math.sin(e * D2R) * Math.sin(L * D2R)) * R2D;
  let eqt = q / 15 - RA / 15;
  if (eqt > 12) eqt -= 24;
  if (eqt < -12) eqt += 24;
  return { decl, eqt };
}

function hourAngle(angle: number, lat: number, decl: number): number {
  const cosH =
    (Math.sin(angle * D2R) - Math.sin(lat * D2R) * Math.sin(decl * D2R)) /
    (Math.cos(lat * D2R) * Math.cos(decl * D2R));
  const c = Math.min(1, Math.max(-1, cosH));
  return Math.acos(c) * R2D;
}

function toHM(t: number): string {
  let h = Math.floor(t);
  let m = Math.round((t - h) * 60);
  if (m === 60) {
    m = 0;
    h += 1;
  }
  h = ((h % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

/** asrFactor: 1 = Shafi/Maliki/Hanbali, 2 = Hanafi */
export function getPrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  methodKey = 'karachi',
  asrFactor = 1,
  tzOffset = -new Date().getTimezoneOffset() / 60,
): PrayerTimes {
  const method = PRAYER_METHODS[methodKey] || PRAYER_METHODS.karachi;
  const jd = g2jd(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / 360;
  const { decl, eqt } = sunPosition(jd);
  const noon = 12 + tzOffset - lng / 15 - eqt;

  const t = (angle: number, dir: 1 | -1) => noon + (dir * hourAngle(angle, lat, decl)) / 15;
  const fajr = t(-method.fajrAngle, -1);
  const sunrise = t(-0.833, -1);
  const dhuhr = noon;
  const asrAlt = Math.atan(1 / (asrFactor + Math.tan(Math.abs(lat - decl) * D2R))) * R2D;
  const asr = noon + hourAngle(90 - asrAlt, lat, decl) / 15;
  const maghrib = t(-0.833, 1) + (method.maghribMinutes || 0) / 60;
  const isha = method.ishaMinutes ? maghrib + method.ishaMinutes / 60 : t(-method.ishaAngle, 1);

  return {
    Fajr: toHM(fajr),
    Sunrise: toHM(sunrise),
    Dhuhr: toHM(dhuhr),
    Asr: toHM(asr),
    Maghrib: toHM(maghrib),
    Isha: toHM(isha),
  };
}

/** Qibla bearing in degrees from true north. */
export function qiblaBearing(lat: number, lng: number): number {
  const kaabaLat = 21.4225 * D2R;
  const kaabaLng = 39.8262 * D2R;
  const la = lat * D2R;
  const lo = lng * D2R;
  const y = Math.sin(kaabaLng - lo);
  const x = Math.cos(la) * Math.tan(kaabaLat) - Math.sin(la) * Math.cos(kaabaLng - lo);
  return ((Math.atan2(y, x) * R2D + 360) % 360);
}

/** Key Islamic observances for a Hijri year -> Gregorian dates. */
export function islamicEventsForHijriYear(hy: number): { name: string; hijri: string; gregorian: string }[] {
  const defs: { name: string; m: number; d: number; days?: number }[] = [
    { name: '1st Ramadan (fasting begins)', m: 9, d: 1 },
    { name: 'Laylat-ul-Qadr (odd nights, last 10)', m: 9, d: 21 },
    { name: 'Eid-ul-Fitr', m: 10, d: 1, days: 3 },
    { name: 'Hajj / Day of Arafah', m: 12, d: 9 },
    { name: 'Eid-ul-Adha', m: 12, d: 10, days: 3 },
    { name: 'Ashura', m: 1, d: 10 },
    { name: 'Eid Milad-un-Nabi', m: 3, d: 12 },
  ];
  return defs.map((e) => {
    const g = hijriToGregorian(hy, e.m, e.d);
    const iso = `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`;
    return { name: e.name, hijri: `${e.d} ${HIJRI_MONTHS[e.m - 1]} ${hy} AH`, gregorian: iso };
  });
}
