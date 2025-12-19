import React from 'react';

import { PlaceholderSection } from '@/components/PlaceholderSection';
import { ScreenGuard } from '@/components/patterns/ScreenGuard';
import { useSessionStore } from '@/stores/sessionStore';

export default function FinanceScreen() {
  const session = useSessionStore();

  return (
    <ScreenGuard session={session} loadingLabel="Loading finance...">
      <PlaceholderSection
        title="Finance"
        description="Finance dashboards and expense tracking UI will be added here; route is wired for navigation."
      />
    </ScreenGuard>
  );
}
