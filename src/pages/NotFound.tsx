import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, EmptyState, Btn } from '../components/ui';
import { DynIcon } from '../components/DynIcon';

export default function NotFound() {
  const nav = useNavigate();
  return (
    <Page title="Page not found" subtitle="The page you're looking for doesn't exist.">
      <EmptyState
        icon={<DynIcon name="Search" size={30} />}
        title="404 — Nothing here"
        text="The link may be broken, or the page may have moved."
        action={<Btn variant="primary" onClick={() => nav('/')}>Back to dashboard</Btn>}
      />
    </Page>
  );
}
