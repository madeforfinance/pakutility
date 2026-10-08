/* Productivity module — notes, tasks, calendar, reminders. */
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';

export const tools: ToolDef[] = [
  {
    id: 'notes',
    name: 'Notes',
    category: 'productivity',
    description: 'Create, search, tag and pin notes. Everything stays on your device.',
    icon: 'StickyNote',
    path: '/productivity/notes',
    keywords: ['note', 'notepad', 'memo', 'ideas', 'list', 'notepad', 'yaad'],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    category: 'productivity',
    description: 'To-do lists with due dates, priorities and repeating tasks.',
    icon: 'CheckSquare',
    path: '/productivity/tasks',
    keywords: ['task', 'todo', 'to-do', 'checklist', 'kaam', 'reminder list'],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    category: 'productivity',
    description: 'Month view combining events, tasks, exams, assignments and Pakistan public holidays.',
    icon: 'Calendar',
    path: '/productivity/calendar',
    keywords: ['calendar', 'month', 'events', 'birthday', 'anniversary', 'schedule', 'tareekh'],
  },
  {
    id: 'reminders',
    name: 'Reminders',
    category: 'productivity',
    description: 'Due-date reminders with optional browser notifications.',
    icon: 'Bell',
    path: '/productivity/reminders',
    keywords: ['reminder', 'alert', 'notify', 'due', 'yaad dilao'],
  },
];

export const routes: RouteDef[] = [
  { path: '/productivity/notes', element: React.lazy(() => import('./pages/NotesPage')) },
  { path: '/productivity/tasks', element: React.lazy(() => import('./pages/TasksPage')) },
  { path: '/productivity/calendar', element: React.lazy(() => import('./pages/CalendarPage')) },
  { path: '/productivity/reminders', element: React.lazy(() => import('./pages/RemindersPage')) },
];
