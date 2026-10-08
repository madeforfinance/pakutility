import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Page } from '../components/ui';
import { ToolCard } from '../components/ToolCard';
import { categoryById, CategoryId } from '../lib/tools';
import { ALL_TOOLS } from '../app/registry';
import { DynIcon } from '../components/DynIcon';

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const valid = ['finance', 'household', 'student', 'professional', 'business', 'vehicle', 'islamic', 'documents', 'productivity', 'tools'].includes(categoryId || '');
  if (!valid) return <Navigate to="/404" replace />;
  const cat = categoryById(categoryId as CategoryId);
  const tools = ALL_TOOLS.filter((t) => t.category === cat.id);

  return (
    <Page title={cat.name} subtitle={cat.tagline}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span className="stat-ic" style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#0B1F3A,#1d3a66)', color: '#fff' }}>
          <DynIcon name={cat.icon} size={24} />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{tools.length} tools</div>
          <div className="muted small">Everything in {cat.name}, working offline.</div>
        </div>
      </div>
      <div className="tool-grid">
        {tools.map((t) => <ToolCard key={t.id} tool={t} />)}
      </div>
    </Page>
  );
}
