import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './app/settings';
import { Shell } from './app/shell';
import { ALL_ROUTES } from './app/registry';
import { Toaster } from './lib/toast';

// Core pages (built in src/pages)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ToolDirectory = React.lazy(() => import('./pages/ToolDirectory'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ActivityPage = React.lazy(() => import('./pages/ActivityPage'));
const MorePage = React.lazy(() => import('./pages/MorePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="/tools" element={<ToolDirectory />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/c/:categoryId" element={<CategoryPage />} />
            {ALL_ROUTES.map((r) => (
              <Route key={r.path} path={r.path} element={<r.element />} />
            ))}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
