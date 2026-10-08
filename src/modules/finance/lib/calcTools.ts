/* ToolDef entries for all config-driven calculators. Shared by index.ts and CalculatorsHub. */
import { ToolDef } from '../../../lib/tools';
import { CALC_DEFS } from './calcs';

export const CALC_TOOLS: ToolDef[] = Object.values(CALC_DEFS).map((d) => ({
  id: `${d.id}-calculator`,
  name: d.title,
  category: 'finance',
  description: d.description,
  icon: d.icon,
  path: `/finance/calc/${d.id}`,
  keywords: [...d.keywords, 'calculator', 'calculate', 'hisab'],
}));
