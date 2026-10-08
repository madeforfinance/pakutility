/* Documents module — templates + expiry tracker. */
import React from 'react';
import { ToolDef, RouteDef } from '../../lib/tools';

export const tools: ToolDef[] = [
  {
    id: 'doc-templates',
    name: 'Document Templates',
    category: 'documents',
    description: '15 professional letter templates — applications, certificates, receipts, agreements. Fill, preview, print or PDF.',
    icon: 'FileText',
    path: '/documents/templates',
    keywords: ['letter', 'application', 'certificate', 'agreement', 'receipt', 'darkhwast', 'arzi', 'letterhead', 'undertaking', 'noc'],
  },
  {
    id: 'expiry-tracker',
    name: 'Document Expiry Tracker',
    category: 'documents',
    description: 'Track CNIC, passport, driving licence, vehicle registration, insurance and subscription renewals.',
    icon: 'IdCard',
    path: '/documents/expiry',
    keywords: ['cnic', 'passport', 'license', 'licence', 'renewal', 'expiry', 'insurance', 'registration', 'nadra'],
  },
];

export const routes: RouteDef[] = [
  { path: '/documents/templates', element: React.lazy(() => import('./pages/TemplatesPage')) },
  { path: '/documents/templates/:id', element: React.lazy(() => import('./pages/TemplateEditorPage')) },
  { path: '/documents/expiry', element: React.lazy(() => import('./pages/ExpiryPage')) },
];
