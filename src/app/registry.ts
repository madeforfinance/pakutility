/* Central registry — aggregates every module's tools + routes. */
import { ToolDef, RouteDef } from '../lib/tools';
import { tools as financeTools, routes as financeRoutes } from '../modules/finance';
import { tools as householdTools, routes as householdRoutes } from '../modules/household';
import { tools as studentTools, routes as studentRoutes } from '../modules/student';
import { tools as professionalTools, routes as professionalRoutes } from '../modules/professional';
import { tools as businessTools, routes as businessRoutes } from '../modules/business';
import { tools as vehicleTools, routes as vehicleRoutes } from '../modules/vehicle';
import { tools as islamicTools, routes as islamicRoutes } from '../modules/islamic';
import { tools as documentsTools, routes as documentsRoutes } from '../modules/documents';
import { tools as productivityTools, routes as productivityRoutes } from '../modules/productivity';
import { tools as quickTools, routes as quickRoutes } from '../modules/quicktools';

export const ALL_TOOLS: ToolDef[] = [
  ...financeTools,
  ...householdTools,
  ...studentTools,
  ...professionalTools,
  ...businessTools,
  ...vehicleTools,
  ...islamicTools,
  ...documentsTools,
  ...productivityTools,
  ...quickTools,
];

export const ALL_ROUTES: RouteDef[] = [
  ...financeRoutes,
  ...householdRoutes,
  ...studentRoutes,
  ...professionalRoutes,
  ...businessRoutes,
  ...vehicleRoutes,
  ...islamicRoutes,
  ...documentsRoutes,
  ...productivityRoutes,
  ...quickRoutes,
];

export function findToolByPath(pathname: string): ToolDef | undefined {
  // longest-prefix match so /finance/calc/emi matches the emi tool
  let best: ToolDef | undefined;
  for (const t of ALL_TOOLS) {
    if (pathname === t.path || pathname.startsWith(t.path + '/')) {
      if (!best || t.path.length > best.path.length) best = t;
    }
  }
  return best;
}
