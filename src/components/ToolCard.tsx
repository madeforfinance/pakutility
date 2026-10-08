import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolDef } from '../lib/tools';
import { DynIcon } from './DynIcon';
import { FavButton } from './ui';
import { useFavorites } from '../app/shell';

export function ToolCard({ tool }: { tool: ToolDef }) {
  const nav = useNavigate();
  const { favs, toggle } = useFavorites();
  const go = () => nav(tool.path);
  return (
    <div className="tool-card" role="link" tabIndex={0} aria-label={tool.name}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>
      <FavButton active={favs.has(tool.id)} onToggle={() => toggle(tool.id)} />
      <span className="tc-ic"><DynIcon name={tool.icon} /></span>
      <span className="tc-name">{tool.name}</span>
      <span className="tc-desc">{tool.description}</span>
    </div>
  );
}
