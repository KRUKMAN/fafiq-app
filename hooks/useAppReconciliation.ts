import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

type Options = {
  orgId?: string | null;
  onResume?: () => Promise<void> | void;
};

export const useAppReconciliation = ({ orgId, onResume }: Options) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const handleChange = (state: AppStateStatus) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['dogs'] });
        queryClient.invalidateQueries({ queryKey: ['transports'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        if (onResume) {
          void onResume();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [orgId, onResume, queryClient]);
};

