# PakUtility — Module Build Contracts

Every module builder MUST follow this document. It is the single source of truth
for integration. Do not invent parallel systems.

## 1. Your deliverable

Create `src/modules/<name>/index.ts` exporting:

```ts
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';

export const tools: ToolDef[] = [ /* every tool in your module */ ];
export const routes: RouteDef[] = [
  { path: '/x/y', element: React.lazy(() => import('./pages/MyPage')) },
];
```

- One page component per file under `src/modules/<name>/pages/`.
- Shared small components under `src/modules/<name>/components/` if needed.
- Module-local logic under `src/modules/<name>/lib/`.

The central registry (`src/app/registry.ts`) already imports your module — create the
exact directory + `index.ts` or the production build fails.

## 2. Imports you may use (nothing else from the app)

```ts
import { db, uid, subscribe } from '../../storage/db';
import { useLive } from '../../hooks/useLive';
import { Page, Card, Btn, IconBtn, Field, TextInput, NumberInput, Select, Textarea,
         Switch, Segmented, Modal, ConfirmDialog, EmptyState, Stat, Badge,
         ProgressBar, Tabs, SearchInput, Chip, FavButton, Skeleton } from '../../components/ui';
import { DynIcon } from '../../components/DynIcon';
import { BarChart, LineChart, DonutChart } from '../../components/charts';
import { toast } from '../../lib/toast';
import { prefs } from '../../lib/prefs';
import { toNum, parseAmount, fmtNum, fmtInt, fmtMoney, fmtMoneyFull, fmtPct,
         fmtDate, fmtDateLong, fmtTime, todayISO, nowISO, parseISODate,
         addDaysISO, daysUntil, monthKey, monthLabel, timeAgo, escapeHtml } from '../../lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS,
         addTransaction, getTransactions, summarize } from '../../lib/money';
import { createPdf, pdfText, pdfKV, pdfTable, pdfTotal } from '../../lib/pdf';
import { gregorianToHijri, hijriToGregorian, hijriToday, fmtHijri, HIJRI_MONTHS,
         getPrayerTimes, PRAYER_METHODS, qiblaBearing, islamicEventsForHijriYear } from '../../lib/islamic';
import taxData from '../../data/tax/2026-27.json';
import holidaysData from '../../data/holidays.json';
```

- Do NOT import from other `src/modules/*` directories.
- Do NOT add npm dependencies. Do NOT call external APIs (exception: quicktools may
  offer an *optional, user-triggered* currency-rate refresh with graceful offline fallback).
- `lucide-react`: import icons directly ONLY if needed inside a page; for tool
  definitions use the icon NAME string (see §4).

## 3. Page conventions

- Wrap every page in `<Page title="…" subtitle="…" actions={…}>`.
- Data loading: `const { data, loading } = useLive(() => db.all('mystore'), [])`.
- Forms: controlled inputs, `Field` with `error` text from `parseAmount()` returning null.
  Never render NaN/undefined/null — guard every computed value.
- Destructive actions: `ConfirmDialog`. Success/error feedback: `toast.success/error`.
- Empty states: `EmptyState` with icon + action button. Never leave blank screens.
- Modals: `Modal` (becomes a bottom sheet on mobile automatically).
- Query-param deep links (from the Add menu) MUST be honored on mount:
  - `/finance/transactions?new=expense|income` → open the transaction form prefilled
  - `/productivity/tasks?new=1`, `/productivity/notes?new=1` → open form
  - `/household/grocery?new=1` → open new list/item form
  - `/business/invoices?new=1` → open invoice form
  - `/vehicle/fuel?new=1` → open fuel expense form
  Use `useSearchParams` from react-router-dom and clear the param after opening.
- Currency: `fmtMoney()` (respects settings). Dates: `fmtDate()`.
- Accessibility: label every input (Field does this), aria-labels on icon-only buttons,
  sufficient contrast, keyboard-operable.

## 4. ToolDef

```ts
{ id: 'emi-calculator', name: 'EMI Calculator', category: 'finance',
  description: 'Monthly installment for any loan amount, rate and tenure.',
  icon: 'Calculator', path: '/finance/calc/emi',
  keywords: ['loan', 'installment', 'qist', 'monthly payment'] }
```

- `id` globally unique (kebab-case). `category` one of:
  `finance household student professional business vehicle islamic documents productivity tools`
- `icon`: pick from DynIcon names: Calculator Percent TrendingUp TrendingDown Tag
  PiggyBank Landmark Wallet Home GraduationCap Briefcase Store Car Moon FileText
  CheckSquare Wrench LayoutDashboard Settings Search Plus Clock Bell Star Fuel Receipt
  FileCheck Users Package ShoppingCart Calendar CalendarDays StickyNote Timer Hourglass
  Scale Coins Banknote CreditCard ArrowLeftRight Split UtensilsCrossed Zap Droplets Wifi
  Phone HeartPulse BookOpen Backpack Bus Sun Compass QrCode KeyRound Shuffle Type Hash
  Ruler Thermometer Weight Box Gauge Database AlarmClock ListChecks FolderOpen Building2
  Plane CircleDollarSign HandCoins ScrollText Award Gift Cake Umbrella ShieldCheck
  FileWarning IdCard BookMarked Languages Globe ArrowRightLeft PercentCircle Sigma
  FunctionSquare ClipboardList TimerReset CalendarClock UserCheck Contact NotebookPen
  LineChart PieChart BarChart3 Repeat History Download Upload Printer Trash2 Pencil Eye
  Copy ChevronRight Info TriangleAlert CircleCheck Sparkles Flame Droplet Leaf MapPin Navigation Train Baby
- `keywords`: include Roman-Urdu/English synonyms users might type (fuel, petrol, tax, qist…).

## 5. Shared data shapes (use EXACTLY — this is the integration rule)

Transactions store `transactions`:
`{ id, type:'income'|'expense', amount:number, category:string, date:'YYYY-MM-DD',
   note:string, method:string, source?:string, sourceId?:string, createdAt:string }`
Use `addTransaction()` from lib/money — household grocery purchases, vehicle fuel,
business costs MUST offer “also record in Money → Expenses” via this helper
(pre-checked checkbox, or automatic with note of source).

Other stores and shapes:
- `budgets`: `{ id, month:'YYYY-MM', total:number, categories:Record<string,number>, savingsTarget:number }`
- `groceryLists`: `{ id, name, createdAt, items:[{id,name,qty,unit,price,category,done}] }`
- `inventory`: `{ id, name, qty, unit, minQty, purchaseDate, expiryDate, note }`
- `tasks`: `{ id, title, note, dueDate, priority:'low'|'medium'|'high', done, recurring?:'daily'|'weekly'|'monthly', createdAt }`
- `notes`: `{ id, title, body, tags:string[], pinned, category, updatedAt }`
- `events`: `{ id, title, date, time?, kind:'event'|'birthday'|'anniversary'|'bill'|'exam'|'holiday', note }`
- `subjects`: `{ id, name, creditHours, color }`
- `assignments`: `{ id, subjectId, title, dueDate, done, priority }`
- `exams`: `{ id, subjectId, title, date, time?, venue?, note }`
- `studySessions`: `{ id, subjectId?, minutes, date, note }`
- `customers`: `{ id, name, phone, email, address, note, createdAt }`
- `products`: `{ id, name, sku, price, cost, qty, category }`
- `sales`: `{ id, productId?, productName, qty, price, cost, date, customerId?, note }`
  → on sale: decrement product qty; offer addTransaction income (Business) — do it
  automatically with source:'business:sale' AND record cost as expense source:'business:cogs'? 
  Simpler: record ONE income txn for revenue with note; profit shown from sales records.
  Decide: income txn = revenue, plus expense txn for COGS with source 'business:cogs'.
- `invoices`: `{ id, number, customerId, customerName, date, dueDate, items:[{desc,qty,rate,discount}], taxRate, notes, status:'draft'|'sent'|'paid' }`
- `quotations`: same shape as invoices, field `validUntil` instead of dueDate.
- `receipts`: `{ id, number, customerName, amount, method, date, description }`
- `vehicles`: `{ id, name, plate, type, mileage }` (mileage = km per litre)
- `maintenance`: `{ id, vehicleId, kind, date, odometer, cost, note, nextDue, nextOdometer }`
- `documents` (expiry tracker): `{ id, title, kind, number, issueDate, expiryDate, note }`
- `reminders`: `{ id, title, date, time?, note, done }`
- `businessProfile` store holds ONE row with id 'profile': `{ id:'profile', name, phone, address, email }`
  (also mirrored from prefs; prefer prefs.businessName etc. for documents)
- Generated letter/document copies: store in `documents`?? NO — letters are ephemeral;
  expiry tracker uses `documents`. Saved generated letters: use store `notes`? 
  Keep letters unsaved (preview/print/PDF only) EXCEPT invoice/quote/receipt which have stores.

## 6. Calculators

Build a config-driven calculator framework in the finance module:
`src/modules/finance/lib/calcs.ts` exports `CALC_DEFS: Record<string, CalcDef>` and
`src/modules/finance/pages/CalcPage.tsx` at route `/finance/calc/:id` renders any def:
```ts
interface CalcField { key:string; label:string; hint?:string; def?:number; min?:number; suffix?:string }
interface CalcDef { id:string; title:string; description:string; fields:CalcField[];
  compute:(v:Record<string,number>)=>{ label:string; value:string; highlight?:boolean }[] }
```
Student/professional/vehicle/quicktools modules may build their OWN small local
calculator UIs (simpler, fewer fields) — consistency via shared `ui` components is enough.

## 7. PDF

Use `createPdf(filename, title, build)` from lib/pdf + pdfText/pdfKV/pdfTable/pdfTotal.
Invoice/Quote/Receipt PDFs: navy header is automatic; include items table, totals,
business info from prefs, document number + dates, footer disclaimer where needed
(letters: “This is a general template, not legal advice.”).

## 8. Quality bar

- `npm run build` must pass (tsc strict). No unused vars that break the build
  (noUnusedLocals is OFF, but keep clean anyway). No `any` leaks into UI text.
- Every tool in your `tools[]` must have a working route in `routes[]`.
- Test mentally: empty store → empty state; invalid input → friendly error;
  huge numbers → formatted; dark mode → readable.
- No “coming soon”, no placeholders, no lorem ipsum. If you list it, it works.
- Privacy: no external requests, no trackers, no console spam.
