# PakUtility — Everyday tools. One place.

**Developed by ASNA Consultancy**

PakUtility is a complete, premium, production-ready, Pakistan-focused everyday utility
Progressive Web App. It combines 100+ everyday calculators, a personal finance manager,
household tools, student tools, professional & freelancer tools, a lightweight business
toolkit with invoicing, vehicle utilities, Islamic & Pakistan utilities, document
templates with PDF export, and productivity tools — in one coherent, installable app.

- **$0 operating cost** — no paid APIs, databases, auth, hosting tiers, or SaaS.
- **Local-first** — all data lives in IndexedDB on the user's device. No account, no sign-up.
- **Offline-capable** — service worker + precaching; every core feature works without internet.
- **Installable** — proper web app manifest, icons, standalone display mode.
- **Private** — no analytics, no trackers, no ads.

## Features (105 tools, 10 categories)

| Category | Highlights |
|---|---|
| Money & Finance | 26 calculators (percentage → EMI → CAGR → take-home salary), transactions, budgets, reports & charts, Pakistan income/salary/sales/withholding tax (configurable slabs in `src/data/tax/`), Zakat |
| Household | Grocery lists, home inventory (low-stock/expiry alerts), household expenses linked to finance |
| Student | GPA/CGPA/grade/attendance/credit-hour calculators, study planner (subjects, assignments, exams), study & Pomodoro timer |
| Professional | Work hours, salary/day/hour, leave tracker, notice period, meeting timer, Pomodoro, countdown, stopwatch, freelancer rate/pricing/quotation/invoice/expense/platform-fee/revenue tools |
| Business | Dashboard, customers, products, sales (auto stock + finance posting), invoices, quotations, receipts — all with client-side PDF export & print |
| Vehicle & Travel | Fuel cost, mileage, trip planner, toll split, vehicle expenses, maintenance reminders, depreciation |
| Islamic & Pakistan | Hijri calendar, prayer times (local astronomical calc, selectable method), Qibla compass, tasbeeh counter, fasting & Ramadan trackers, Islamic events, Pakistan public holidays |
| Documents | 15 letter/certificate templates (print + PDF), document expiry tracker (CNIC, passport, licence…) |
| Productivity | Notes, tasks (recurring), calendar, reminders with browser notifications |
| Quick Tools | Calculator, age, date difference, unit converter, stopwatch, timer, random number, password generator, QR generator, word counter, text case, currency converter (user-set rates + optional free refresh) |

Plus: customizable dashboard, global search (Ctrl+K), favorites, recently-used tools,
tool directory, light/dark/system themes, JSON backup export/import (merge or replace),
and full data wipe.

## Tech stack

- React 18 + TypeScript + Vite 6
- react-router-dom (BrowserRouter + Vercel rewrites for SPA routing)
- IndexedDB (hand-rolled promise wrapper, one store per domain) + localStorage-free settings in IDB
- vite-plugin-pwa (Workbox service worker, precache, offline navigation fallback)
- lucide-react icons (open source), zero-dependency SVG charts
- jsPDF (MIT, lazy-loaded) for client-side PDF generation; `qrcode` (MIT) for QR codes
- No backend, no database server, no auth provider, no analytics

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
```

## Production build

```bash
npm run build     # type-checks (tsc) then builds to dist/
npm run preview   # serve the production build locally
```

## Deploy to Vercel

Option A — Vercel dashboard:
1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (both auto-detected; `vercel.json` also pins them).
4. Deploy. The included `vercel.json` rewrite sends all routes to `index.html` so deep links and refreshes never 404.

Option B — Vercel CLI:

```bash
npx vercel          # preview deployment
npx vercel --prod   # production
```

HTTPS is automatic on Vercel, which enables PWA installability, service workers,
geolocation and notifications.

## Install the PWA

- **Android / mobile Chrome:** open the deployed URL → menu ⋮ → *Install app* / *Add to Home screen*.
- **Desktop Chrome/Edge:** open the URL → install icon in the address bar → *Install*.

## Data storage & backup

- Everything is stored locally in IndexedDB (`pakutility-db`), one object store per
  domain (transactions, budgets, notes, tasks, …). Preferences live in the `settings` store.
- **Settings → Data & backup → Export backup** downloads `pakutility-backup-YYYY-MM-DD.json`.
- **Import backup** validates the file first, then lets you **merge** or **replace**.
- **Delete all data** wipes the local database (with confirmation).

## Privacy

No account. No cloud. No Google Analytics, Meta Pixel, or any tracker. Calculations,
PDFs, charts and storage all happen on-device. Currency rates refresh (optional,
user-triggered) is the only network call the app ever makes, and it degrades
gracefully to saved rates offline.

## Tax & religious notes

- Tax calculators read slabs from `src/data/tax/2026-27.json` (never hard-coded) and
  are **estimates** — verify current official FBR rules before filing.
- Hijri dates use the tabular calendar and may differ from local moon sighting by a
  day; an adjustment setting is provided. Prayer times are astronomically computed
  for the selected method — not a religious ruling.

## Project structure

```
pakutility/
├── public/               # icons, manifest assets, social preview
├── src/
│   ├── app/              # shell, router wiring, settings provider, registry, search
│   ├── components/       # UI primitives, charts, dynamic icons, tool cards
│   ├── hooks/            # useLive (reactive IndexedDB reads)
│   ├── lib/              # db helpers, money domain, format, pdf, islamic math, toast
│   ├── data/tax/         # Pakistan tax slabs (JSON, swappable per tax year)
│   ├── data/             # holidays dataset
│   ├── modules/          # finance, household, student, professional, business,
│   │                     # vehicle, islamic, documents, productivity, quicktools
│   ├── pages/            # dashboard, directory, search, activity, more, settings
│   └── styles/           # design system (CSS variables, themes, responsive)
├── vercel.json           # build + SPA rewrites + manifest headers
└── README.md
```
