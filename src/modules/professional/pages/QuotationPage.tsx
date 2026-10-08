/* Client Quotation page — thin wrapper over the shared DocBuilder. */
import React from 'react';
import DocBuilder from '../components/DocBuilder';

export default function QuotationPage() {
  return <DocBuilder kind="quotation" />;
}
