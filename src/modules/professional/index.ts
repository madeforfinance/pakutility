/* Professional module — work tools, timers and freelancer toolkit. */
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';
import './professional.css';

export const tools: ToolDef[] = [
  {
    id: 'work-hours', name: 'Work Hours Calculator', category: 'professional',
    description: 'Daily and weekly work hours with a regular vs overtime split.',
    icon: 'Clock', path: '/professional/work-hours',
    keywords: ['shift', 'duty', 'overtime', 'hours', 'hazri', 'attendance', 'roster'],
  },
  {
    id: 'salary-per-day', name: 'Salary per Day', category: 'professional',
    description: 'Convert your monthly salary into a per-day rate.',
    icon: 'Banknote', path: '/professional/salary-day',
    keywords: ['tankhwah', 'salary', 'daily wage', 'per day', 'roz', 'pay'],
  },
  {
    id: 'salary-per-hour', name: 'Salary per Hour', category: 'professional',
    description: 'Convert your monthly salary into an hourly rate.',
    icon: 'Timer', path: '/professional/salary-hour',
    keywords: ['tankhwah', 'salary', 'hourly', 'per hour', 'overtime rate', 'pay'],
  },
  {
    id: 'leave-tracker', name: 'Leave Tracker', category: 'professional',
    description: 'Track annual leave entitlement, leaves taken and remaining balance.',
    icon: 'CalendarDays', path: '/professional/leave',
    keywords: ['chutti', 'leave', 'vacation', 'holiday', 'annual leave', 'absent'],
  },
  {
    id: 'notice-period', name: 'Notice Period Calculator', category: 'professional',
    description: 'Find your last working day from resignation date and notice period.',
    icon: 'CalendarClock', path: '/professional/notice-period',
    keywords: ['resignation', 'notice', 'last working day', 'istifa', 'quit job'],
  },
  {
    id: 'meeting-timer', name: 'Meeting Timer', category: 'professional',
    description: 'Run meetings on time with per-agenda-item countdowns.',
    icon: 'TimerReset', path: '/professional/meeting-timer',
    keywords: ['meeting', 'agenda', 'timer', 'countdown', 'standup'],
  },
  {
    id: 'pomodoro', name: 'Pomodoro Timer', category: 'professional',
    description: 'Focus in timed sprints with short and long breaks.',
    icon: 'AlarmClock', path: '/professional/pomodoro',
    keywords: ['pomodoro', 'focus', 'study timer', 'productivity', 'deep work'],
  },
  {
    id: 'countdown', name: 'Countdown', category: 'professional',
    description: 'Live day/hour/minute/second countdown to any date and time.',
    icon: 'Hourglass', path: '/professional/countdown',
    keywords: ['countdown', 'deadline', 'days left', 'timer', 'event'],
  },
  {
    id: 'stopwatch-pro', name: 'Stopwatch', category: 'professional',
    description: 'Precision stopwatch with lap and split times.',
    icon: 'Timer', path: '/professional/stopwatch',
    keywords: ['stopwatch', 'lap', 'timer', 'split time'],
  },
  {
    id: 'freelance-rate', name: 'Freelance Hourly Rate', category: 'professional',
    description: 'The hourly rate your income goals require, after expenses and platform fees.',
    icon: 'CircleDollarSign', path: '/professional/freelance/rate',
    keywords: ['freelancer', 'hourly rate', 'upwork', 'fiverr', 'rate calculator', 'charge'],
  },
  {
    id: 'project-pricing', name: 'Project Pricing', category: 'professional',
    description: 'Price a project from hours, hourly rate, expenses and profit margin.',
    icon: 'Briefcase', path: '/professional/freelance/pricing',
    keywords: ['project price', 'quote price', 'project cost', 'freelancer', 'margin', 'estimate'],
  },
  {
    id: 'client-quotation', name: 'Client Quotation', category: 'professional',
    description: 'Create, preview and PDF-export professional client quotations.',
    icon: 'FileText', path: '/professional/freelance/quotation',
    keywords: ['quotation', 'quote', 'estimate', 'proposal', 'pdf', 'client'],
  },
  {
    id: 'freelance-invoice', name: 'Freelance Invoice', category: 'professional',
    description: 'Create, preview and PDF-export professional invoices.',
    icon: 'Receipt', path: '/professional/freelance/invoice',
    keywords: ['invoice', 'bill', 'payment', 'pdf', 'client', 'billing'],
  },
  {
    id: 'freelance-expenses', name: 'Freelance Expenses', category: 'professional',
    description: 'Log freelance business expenses — synced into Money automatically.',
    icon: 'TrendingDown', path: '/professional/freelance/expenses',
    keywords: ['expense', 'kharcha', 'business expense', 'cost', 'freelancer', 'money'],
  },
  {
    id: 'platform-fee', name: 'Platform Fee Calculator', category: 'professional',
    description: 'See what platform fees take from earnings, or gross-up a target net.',
    icon: 'Percent', path: '/professional/freelance/platform-fee',
    keywords: ['upwork fee', 'fiverr fee', 'platform fee', 'commission', 'service fee', 'gross up'],
  },
  {
    id: 'freelance-revenue', name: 'Freelance Revenue', category: 'professional',
    description: 'Monthly freelance income chart, totals and averages.',
    icon: 'LineChart', path: '/professional/freelance/revenue',
    keywords: ['income', 'revenue', 'earnings', 'amdan', 'freelancer', 'chart'],
  },
];

export const routes: RouteDef[] = [
  { path: '/professional/work-hours', element: React.lazy(() => import('./pages/WorkHoursPage')) },
  { path: '/professional/salary-day', element: React.lazy(() => import('./pages/SalaryDayPage')) },
  { path: '/professional/salary-hour', element: React.lazy(() => import('./pages/SalaryHourPage')) },
  { path: '/professional/leave', element: React.lazy(() => import('./pages/LeaveTrackerPage')) },
  { path: '/professional/notice-period', element: React.lazy(() => import('./pages/NoticePeriodPage')) },
  { path: '/professional/meeting-timer', element: React.lazy(() => import('./pages/MeetingTimerPage')) },
  { path: '/professional/pomodoro', element: React.lazy(() => import('./pages/PomodoroPage')) },
  { path: '/professional/countdown', element: React.lazy(() => import('./pages/CountdownPage')) },
  { path: '/professional/stopwatch', element: React.lazy(() => import('./pages/StopwatchPage')) },
  { path: '/professional/freelance/rate', element: React.lazy(() => import('./pages/FreelanceRatePage')) },
  { path: '/professional/freelance/pricing', element: React.lazy(() => import('./pages/ProjectPricingPage')) },
  { path: '/professional/freelance/quotation', element: React.lazy(() => import('./pages/QuotationPage')) },
  { path: '/professional/freelance/invoice', element: React.lazy(() => import('./pages/FreelanceInvoicePage')) },
  { path: '/professional/freelance/expenses', element: React.lazy(() => import('./pages/FreelanceExpensesPage')) },
  { path: '/professional/freelance/platform-fee', element: React.lazy(() => import('./pages/PlatformFeePage')) },
  { path: '/professional/freelance/revenue', element: React.lazy(() => import('./pages/FreelanceRevenuePage')) },
];
