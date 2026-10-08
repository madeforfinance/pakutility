/* Config-driven calculator framework for the finance module.
   Every calculator is a pure definition: fields + compute. CalcPage renders any def. */
import { fmtMoney, fmtMoneyFull, fmtNum, fmtPct, fmtInt } from '../../../lib/format';
import { computeSlabTax, salarySlabs } from './tax';

export interface CalcField {
  key: string;
  label: string;
  hint?: string;
  def?: number;
  min?: number;
  suffix?: string;
}

export interface CalcResult {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface CalcDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  note?: string;
  fields: CalcField[];
  compute: (v: Record<string, number>) => CalcResult[];
}

/** Shared amortizing-loan math (loan + EMI calculators). */
function loanSchedule(v: Record<string, number>) {
  const amount = v.amount;
  const r = v.rate / 100 / 12;
  const n = Math.max(1, Math.round(v.years * 12));
  const emi = r > 0 ? (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : amount / n;
  const totalPayable = emi * n;
  return { monthly: emi, totalInterest: Math.max(0, totalPayable - amount), totalPayable, months: n };
}

const signed = (n: number, digits = 0) => (n < 0 ? `−${fmtMoneyFull(Math.abs(n), digits)}` : fmtMoneyFull(n, digits));

export const CALC_DEFS: Record<string, CalcDef> = {
  percentage: {
    id: 'percentage',
    title: 'Percentage Calculator',
    description: 'Find X% of any amount, or add/subtract a percentage.',
    icon: 'Percent',
    keywords: ['percent', 'feesad', 'percentage of', '%'],
    fields: [
      { key: 'value', label: 'Amount', def: 10000 },
      { key: 'percent', label: 'Percentage (%)', def: 15 },
    ],
    compute: (v) => {
      const p = (v.value * v.percent) / 100;
      return [
        { label: `${fmtNum(v.percent, 2)}% of amount`, value: fmtMoney(p), highlight: true },
        { label: 'Amount + percentage', value: fmtMoney(v.value + p) },
        { label: 'Amount − percentage', value: fmtMoney(v.value - p) },
      ];
    },
  },
  'percentage-change': {
    id: 'percentage-change',
    title: 'Percentage Change Calculator',
    description: 'Increase or decrease between two values, in amount and percent.',
    icon: 'ArrowRightLeft',
    keywords: ['change', 'increase', 'decrease', 'growth', 'izafa', 'kami'],
    fields: [
      { key: 'old', label: 'Old value', def: 8000 },
      { key: 'new', label: 'New value', def: 10000 },
    ],
    compute: (v) => {
      const change = v.new - v.old;
      const pct = v.old !== 0 ? (change / v.old) * 100 : 0;
      const dir = change > 0 ? 'Increase' : change < 0 ? 'Decrease' : 'No change';
      return [
        { label: 'Change amount', value: signed(change) },
        { label: 'Percentage change', value: `${change < 0 ? '−' : ''}${fmtPct(Math.abs(pct))}`, highlight: true },
        { label: 'Direction', value: dir },
      ];
    },
  },
  discount: {
    id: 'discount',
    title: 'Discount Calculator',
    description: 'Sale price after discount, and exactly how much you save.',
    icon: 'Tag',
    keywords: ['discount', 'sale', 'off', 'chhoot', 'bargain'],
    fields: [
      { key: 'original', label: 'Original price', def: 5000 },
      { key: 'discount', label: 'Discount (%)', def: 20 },
    ],
    compute: (v) => {
      const amt = (v.original * v.discount) / 100;
      return [
        { label: 'Discount amount', value: fmtMoney(amt) },
        { label: 'Final price', value: fmtMoney(Math.max(0, v.original - amt)), highlight: true },
        { label: 'You save', value: fmtPct(v.discount) },
      ];
    },
  },
  profit: {
    id: 'profit',
    title: 'Profit Calculator',
    description: 'Profit amount and profit percentage on cost.',
    icon: 'TrendingUp',
    keywords: ['profit', 'munafa', 'gain', 'nafa'],
    fields: [
      { key: 'cost', label: 'Cost price', def: 4000 },
      { key: 'selling', label: 'Selling price', def: 5500 },
    ],
    compute: (v) => {
      const p = v.selling - v.cost;
      return [
        { label: 'Profit amount', value: signed(p), highlight: true },
        { label: 'Profit on cost', value: v.cost !== 0 ? fmtPct((p / v.cost) * 100) : '—' },
        { label: 'Margin on selling', value: v.selling !== 0 ? fmtPct((p / v.selling) * 100) : '—' },
      ];
    },
  },
  loss: {
    id: 'loss',
    title: 'Loss Calculator',
    description: 'Loss amount and loss percentage on cost.',
    icon: 'TrendingDown',
    keywords: ['loss', 'nuqsan', 'khasara'],
    fields: [
      { key: 'cost', label: 'Cost price', def: 5500 },
      { key: 'selling', label: 'Selling price', def: 4000 },
    ],
    compute: (v) => {
      const l = v.cost - v.selling;
      return [
        { label: 'Loss amount', value: l > 0 ? fmtMoney(l) : 'No loss', highlight: true },
        { label: 'Loss on cost', value: v.cost !== 0 && l > 0 ? fmtPct((l / v.cost) * 100) : '—' },
      ];
    },
  },
  'profit-margin': {
    id: 'profit-margin',
    title: 'Profit Margin Calculator',
    description: 'Gross profit, margin on revenue and markup on cost.',
    icon: 'PieChart',
    keywords: ['margin', 'markup', 'gross profit'],
    fields: [
      { key: 'revenue', label: 'Revenue (selling price)', def: 100000 },
      { key: 'cost', label: 'Total cost', def: 70000 },
    ],
    compute: (v) => {
      const g = v.revenue - v.cost;
      return [
        { label: 'Gross profit', value: signed(g), highlight: true },
        { label: 'Profit margin (on revenue)', value: v.revenue !== 0 ? fmtPct((g / v.revenue) * 100) : '—' },
        { label: 'Markup (on cost)', value: v.cost !== 0 ? fmtPct((g / v.cost) * 100) : '—' },
      ];
    },
  },
  markup: {
    id: 'markup',
    title: 'Markup Calculator',
    description: 'Selling price from cost plus a markup percentage.',
    icon: 'Plus',
    keywords: ['markup', 'price up', 'nafa'],
    fields: [
      { key: 'cost', label: 'Cost price', def: 4000 },
      { key: 'markup', label: 'Markup (%)', def: 30 },
    ],
    compute: (v) => {
      const p = (v.cost * v.markup) / 100;
      return [
        { label: 'Selling price', value: fmtMoney(v.cost + p), highlight: true },
        { label: 'Profit amount', value: fmtMoney(p) },
      ];
    },
  },
  'break-even': {
    id: 'break-even',
    title: 'Break-even Calculator',
    description: 'Units and revenue needed to cover all costs.',
    icon: 'Scale',
    keywords: ['break even', 'breakeven', 'units', 'no profit no loss'],
    fields: [
      { key: 'fixed', label: 'Fixed costs', def: 200000 },
      { key: 'price', label: 'Price per unit', def: 500 },
      { key: 'variable', label: 'Variable cost per unit', def: 300 },
    ],
    compute: (v) => {
      const contrib = v.price - v.variable;
      if (contrib <= 0) {
        return [
          { label: 'Break-even units', value: 'Not possible', highlight: true },
          { label: 'Reason', value: 'Price must be higher than variable cost per unit' },
        ];
      }
      const units = v.fixed / contrib;
      return [
        { label: 'Break-even units', value: `${fmtInt(Math.ceil(units))} units`, highlight: true },
        { label: 'Break-even revenue', value: fmtMoney(units * v.price) },
        { label: 'Contribution per unit', value: fmtMoney(contrib) },
      ];
    },
  },
  'simple-interest': {
    id: 'simple-interest',
    title: 'Simple Interest Calculator',
    description: 'Interest and total on principal at a flat annual rate.',
    icon: 'Coins',
    keywords: ['simple interest', 'sood', 'interest'],
    fields: [
      { key: 'principal', label: 'Principal amount', def: 100000 },
      { key: 'rate', label: 'Annual rate (%)', def: 12 },
      { key: 'years', label: 'Years', def: 3, min: 0 },
    ],
    compute: (v) => {
      const i = (v.principal * v.rate * v.years) / 100;
      return [
        { label: 'Interest earned', value: fmtMoney(i), highlight: true },
        { label: 'Total amount', value: fmtMoney(v.principal + i) },
      ];
    },
  },
  'compound-interest': {
    id: 'compound-interest',
    title: 'Compound Interest Calculator',
    description: 'Growth with compounding — see what reinvesting earns.',
    icon: 'TrendingUp',
    keywords: ['compound', 'murakkab sood', 'growth', 'investment'],
    fields: [
      { key: 'principal', label: 'Principal amount', def: 100000 },
      { key: 'rate', label: 'Annual rate (%)', def: 12 },
      { key: 'years', label: 'Years', def: 5, min: 0 },
      { key: 'compounds', label: 'Compounds per year', def: 12, min: 1, hint: '12 = monthly, 4 = quarterly, 1 = yearly' },
    ],
    compute: (v) => {
      const n = Math.max(1, Math.round(v.compounds));
      const total = v.principal * Math.pow(1 + v.rate / 100 / n, n * v.years);
      return [
        { label: 'Total amount', value: fmtMoney(total), highlight: true },
        { label: 'Interest earned', value: fmtMoney(total - v.principal) },
        { label: 'Effective annual rate', value: fmtPct((Math.pow(1 + v.rate / 100 / n, n) - 1) * 100, 2) },
      ];
    },
  },
  roi: {
    id: 'roi',
    title: 'ROI Calculator',
    description: 'Return on investment as amount and percentage.',
    icon: 'CircleDollarSign',
    keywords: ['roi', 'return on investment', 'munafa'],
    fields: [
      { key: 'investment', label: 'Investment amount', def: 200000 },
      { key: 'ret', label: 'Return amount', def: 260000 },
    ],
    compute: (v) => {
      const net = v.ret - v.investment;
      return [
        { label: 'Net profit / loss', value: signed(net) },
        { label: 'ROI', value: v.investment !== 0 ? fmtPct((net / v.investment) * 100) : '—', highlight: true },
      ];
    },
  },
  cagr: {
    id: 'cagr',
    title: 'CAGR Calculator',
    description: 'Compound annual growth rate between two values.',
    icon: 'LineChart',
    keywords: ['cagr', 'growth rate', 'annual growth'],
    fields: [
      { key: 'begin', label: 'Beginning value', def: 100000 },
      { key: 'end', label: 'Ending value', def: 180000 },
      { key: 'years', label: 'Years', def: 5, min: 0 },
    ],
    compute: (v) => {
      const cagr = v.begin > 0 && v.years > 0 ? (Math.pow(v.end / v.begin, 1 / v.years) - 1) * 100 : 0;
      return [
        { label: 'CAGR', value: fmtPct(cagr, 2), highlight: true },
        { label: 'Total growth', value: v.begin !== 0 ? fmtPct(((v.end - v.begin) / v.begin) * 100) : '—' },
      ];
    },
  },
  loan: {
    id: 'loan',
    title: 'Loan Calculator',
    description: 'Monthly payment, total interest and total payable for any loan.',
    icon: 'Landmark',
    keywords: ['loan', 'qarz', 'monthly payment', 'amortization'],
    fields: [
      { key: 'amount', label: 'Loan amount', def: 1000000 },
      { key: 'rate', label: 'Annual rate (%)', def: 20 },
      { key: 'years', label: 'Years', def: 5, min: 0 },
    ],
    compute: (v) => {
      const s = loanSchedule(v);
      return [
        { label: 'Monthly payment', value: fmtMoney(s.monthly), highlight: true },
        { label: 'Total interest', value: fmtMoney(s.totalInterest) },
        { label: 'Total payable', value: fmtMoney(s.totalPayable) },
        { label: 'Number of payments', value: `${s.months}` },
      ];
    },
  },
  emi: {
    id: 'emi',
    title: 'EMI Calculator',
    description: 'Equated monthly installment (qist) for loans and financing.',
    icon: 'CalendarClock',
    keywords: ['emi', 'qist', 'installment', 'monthly payment', 'kist'],
    fields: [
      { key: 'amount', label: 'Financed amount', def: 500000 },
      { key: 'rate', label: 'Annual rate (%)', def: 18 },
      { key: 'years', label: 'Years', def: 3, min: 0 },
    ],
    compute: (v) => {
      const s = loanSchedule(v);
      return [
        { label: 'Monthly EMI (qist)', value: fmtMoney(s.monthly), highlight: true },
        { label: 'Total interest / markup', value: fmtMoney(s.totalInterest) },
        { label: 'Total payable', value: fmtMoney(s.totalPayable) },
      ];
    },
  },
  installment: {
    id: 'installment',
    title: 'Installment Plan Calculator',
    description: 'Monthly installment with down payment and monthly markup.',
    icon: 'CreditCard',
    keywords: ['installment', 'qist', 'down payment', 'markup plan'],
    fields: [
      { key: 'price', label: 'Price', def: 150000 },
      { key: 'down', label: 'Down payment', def: 30000, min: 0 },
      { key: 'months', label: 'Months', def: 12, min: 1 },
      { key: 'markup', label: 'Monthly markup (%)', def: 2, min: 0, hint: 'Markup charged each month on financed amount' },
    ],
    compute: (v) => {
      const financed = Math.max(0, v.price - v.down);
      const totalMarkup = (financed * v.markup * v.months) / 100;
      const total = financed + totalMarkup;
      const monthly = v.months > 0 ? total / v.months : 0;
      return [
        { label: 'Monthly installment', value: fmtMoney(monthly), highlight: true },
        { label: 'Total payable', value: fmtMoney(total) },
        { label: 'Total markup paid', value: fmtMoney(totalMarkup) },
      ];
    },
  },
  'savings-goal': {
    id: 'savings-goal',
    title: 'Savings Goal Calculator',
    description: 'How much to save each month to reach your target.',
    icon: 'PiggyBank',
    keywords: ['savings', 'goal', 'bachat', 'target'],
    fields: [
      { key: 'target', label: 'Target amount', def: 500000 },
      { key: 'months', label: 'Months', def: 12, min: 1 },
      { key: 'existing', label: 'Existing savings', def: 50000, min: 0 },
    ],
    compute: (v) => {
      const needed = Math.max(0, v.target - v.existing);
      return [
        { label: 'Save per month', value: fmtMoney(v.months > 0 ? needed / v.months : 0), highlight: true },
        { label: 'Still needed', value: fmtMoney(needed) },
        { label: 'Already saved', value: fmtPct(v.target > 0 ? (v.existing / v.target) * 100 : 0) + ' of goal' },
      ];
    },
  },
  inflation: {
    id: 'inflation',
    title: 'Inflation Calculator',
    description: 'What a sum today will cost in the future at given inflation.',
    icon: 'TrendingDown',
    keywords: ['inflation', 'mehangai', 'purchasing power', 'future value'],
    fields: [
      { key: 'amount', label: "Today's amount", def: 100000 },
      { key: 'inflation', label: 'Inflation % per year', def: 10, min: 0 },
      { key: 'years', label: 'Years', def: 5, min: 0 },
    ],
    compute: (v) => {
      const future = v.amount * Math.pow(1 + v.inflation / 100, v.years);
      return [
        { label: 'Future value needed', value: fmtMoney(future), highlight: true },
        { label: 'Additional amount needed', value: fmtMoney(future - v.amount) },
        { label: "Today's purchasing power of future sum", value: fmtMoney(v.amount / Math.pow(1 + v.inflation / 100, v.years)) },
      ];
    },
  },
  salary: {
    id: 'salary',
    title: 'Salary Calculator',
    description: 'Net monthly and annual salary from gross, allowances and deductions.',
    icon: 'Banknote',
    keywords: ['salary', 'tankhwa', 'pay', 'net salary', 'gross'],
    fields: [
      { key: 'gross', label: 'Monthly gross (basic)', def: 100000 },
      { key: 'allowances', label: 'Allowances', def: 20000, min: 0 },
      { key: 'deductions', label: 'Deductions (EOBI, etc.)', def: 5000, min: 0 },
    ],
    compute: (v) => {
      const net = v.gross + v.allowances - v.deductions;
      return [
        { label: 'Net monthly salary', value: fmtMoney(net), highlight: true },
        { label: 'Annual gross', value: fmtMoney((v.gross + v.allowances) * 12) },
        { label: 'Annual net', value: fmtMoney(net * 12) },
      ];
    },
  },
  'take-home': {
    id: 'take-home',
    title: 'Take-Home Salary Calculator',
    description: 'Monthly salary after estimated income tax (FBR salaried slabs).',
    icon: 'Wallet',
    keywords: ['take home', 'salary after tax', 'net pay', 'tankhwa'],
    note: 'Estimate only — uses FBR salaried-person slabs. Verify current official rules.',
    fields: [{ key: 'gross', label: 'Monthly gross salary', def: 150000 }],
    compute: (v) => {
      const annual = v.gross * 12;
      const tax = computeSlabTax(annual, salarySlabs());
      const monthlyTax = tax.total / 12;
      return [
        { label: 'Monthly take-home', value: fmtMoney(Math.max(0, v.gross - monthlyTax)), highlight: true },
        { label: 'Monthly income tax (est.)', value: fmtMoney(monthlyTax) },
        { label: 'Annual tax (est.)', value: fmtMoney(tax.total) },
        { label: 'Effective tax rate', value: fmtPct(tax.effective) },
      ];
    },
  },
  overtime: {
    id: 'overtime',
    title: 'Overtime Calculator',
    description: 'Overtime pay from monthly salary, hours and rate multiplier.',
    icon: 'AlarmClock',
    keywords: ['overtime', 'extra hours', 'ot'],
    fields: [
      { key: 'salary', label: 'Monthly salary', def: 80000 },
      { key: 'hours', label: 'Overtime hours', def: 10, min: 0 },
      { key: 'multiplier', label: 'Rate multiplier', def: 1.5, min: 0, hint: '1.5× is standard; 2× on holidays' },
    ],
    note: 'Hourly rate = monthly salary ÷ 208 (26 days × 8 hours).',
    compute: (v) => {
      const hourly = v.salary / 208;
      return [
        { label: 'Overtime pay', value: fmtMoney(hourly * v.hours * v.multiplier), highlight: true },
        { label: 'Normal hourly rate', value: fmtMoney(hourly) },
      ];
    },
  },
  'hourly-rate': {
    id: 'hourly-rate',
    title: 'Hourly Rate Calculator',
    description: 'Convert a monthly salary into an hourly rate.',
    icon: 'Clock',
    keywords: ['hourly', 'per hour', 'rate'],
    fields: [
      { key: 'salary', label: 'Monthly salary', def: 100000 },
      { key: 'hours', label: 'Hours per week', def: 48, min: 1 },
    ],
    note: 'Assumes 4.33 weeks per month.',
    compute: (v) => {
      const hourly = v.hours > 0 ? v.salary / (v.hours * 4.33) : 0;
      return [
        { label: 'Hourly rate', value: fmtMoney(hourly), highlight: true },
        { label: 'Weekly earnings', value: fmtMoney(hourly * v.hours) },
      ];
    },
  },
  'daily-wage': {
    id: 'daily-wage',
    title: 'Daily Wage Calculator',
    description: 'Per-day earnings from a monthly salary.',
    icon: 'CalendarDays',
    keywords: ['daily', 'wage', 'dehari', 'per day', 'roz'],
    fields: [
      { key: 'salary', label: 'Monthly salary', def: 60000 },
      { key: 'days', label: 'Working days per month', def: 26, min: 1 },
    ],
    compute: (v) => {
      const daily = v.days > 0 ? v.salary / v.days : 0;
      return [
        { label: 'Daily wage', value: fmtMoney(daily), highlight: true },
        { label: 'Hourly (8-hr day)', value: fmtMoney(daily / 8) },
      ];
    },
  },
  'expense-split': {
    id: 'expense-split',
    title: 'Expense Split Calculator',
    description: 'Split any bill equally between people.',
    icon: 'Split',
    keywords: ['split', 'divide', 'share', 'hissa', 'per person'],
    note: 'For unequal shares, calculate each person’s share as a separate split.',
    fields: [
      { key: 'total', label: 'Total bill', def: 6000 },
      { key: 'people', label: 'Number of people', def: 3, min: 1 },
    ],
    compute: (v) => {
      const per = v.people > 0 ? v.total / v.people : 0;
      return [
        { label: 'Each person pays', value: fmtMoney(per), highlight: true },
        { label: 'Total', value: fmtMoney(v.total) },
      ];
    },
  },
  tip: {
    id: 'tip',
    title: 'Tip Calculator',
    description: 'Tip amount, total bill and per-person share.',
    icon: 'HandCoins',
    keywords: ['tip', 'bakshish', 'service charge'],
    fields: [
      { key: 'bill', label: 'Bill amount', def: 5000 },
      { key: 'tip', label: 'Tip (%)', def: 10, min: 0 },
      { key: 'people', label: 'People', def: 1, min: 1 },
    ],
    compute: (v) => {
      const tipAmt = (v.bill * v.tip) / 100;
      const total = v.bill + tipAmt;
      return [
        { label: 'Tip amount', value: fmtMoney(tipAmt) },
        { label: 'Total with tip', value: fmtMoney(total), highlight: true },
        { label: 'Per person', value: fmtMoney(v.people > 0 ? total / v.people : total) },
      ];
    },
  },
  'net-worth': {
    id: 'net-worth',
    title: 'Net Worth Calculator',
    description: 'Total assets minus total liabilities — your true financial position.',
    icon: 'Scale',
    keywords: ['net worth', 'assets', 'liabilities', 'maliyat'],
    fields: [
      { key: 'cash', label: 'Cash in hand', def: 50000, min: 0 },
      { key: 'bank', label: 'Bank balance', def: 200000, min: 0 },
      { key: 'investments', label: 'Investments', def: 300000, min: 0 },
      { key: 'property', label: 'Property value', def: 5000000, min: 0 },
      { key: 'otherAssets', label: 'Other assets', def: 0, min: 0 },
      { key: 'loans', label: 'Loans owed', def: 1000000, min: 0 },
      { key: 'debts', label: 'Other debts', def: 0, min: 0 },
    ],
    compute: (v) => {
      const assets = v.cash + v.bank + v.investments + v.property + v.otherAssets;
      const liab = v.loans + v.debts;
      return [
        { label: 'Total assets', value: fmtMoney(assets) },
        { label: 'Total liabilities', value: fmtMoney(liab) },
        { label: 'Net worth', value: signed(assets - liab), highlight: true },
      ];
    },
  },
  'investment-return': {
    id: 'investment-return',
    title: 'Investment Return Calculator',
    description: 'Total and annualized return on any investment.',
    icon: 'TrendingUp',
    keywords: ['investment return', 'gain', 'annualized', 'sarmaya kari'],
    fields: [
      { key: 'invested', label: 'Amount invested', def: 500000 },
      { key: 'current', label: 'Current value', def: 650000 },
      { key: 'years', label: 'Years held', def: 2, min: 0 },
    ],
    compute: (v) => {
      const gain = v.current - v.invested;
      const totalRet = v.invested !== 0 ? (gain / v.invested) * 100 : 0;
      const ann = v.invested > 0 && v.years > 0 ? (Math.pow(v.current / v.invested, 1 / v.years) - 1) * 100 : 0;
      return [
        { label: 'Gain / loss', value: signed(gain) },
        { label: 'Total return', value: `${gain < 0 ? '−' : ''}${fmtPct(Math.abs(totalRet))}`, highlight: true },
        { label: 'Annualized return', value: `${ann < 0 ? '−' : ''}${fmtPct(Math.abs(ann), 2)}` },
      ];
    },
  },
};
