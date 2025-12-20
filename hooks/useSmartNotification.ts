import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

export type SmartMessage = { variant: 'info' | 'success' | 'error'; text: string };

export const useSmartNotification = (defaultToast?: boolean) => {
  const [message, setMessage] = useState<SmartMessage | null>(null);

  const notify = useCallback(
    async (variant: SmartMessage['variant'], text: string, opts?: { toast?: boolean }) => {
      setMessage({ variant, text });
      const shouldToast = opts?.toast ?? (defaultToast ?? Platform.OS === 'web');

      if (!shouldToast) return;

      try {
        if (Platform.OS === 'web') {
          const { toast } = await import('sonner');
          if (variant === 'error') toast.error(text);
          else if (variant === 'success') toast.success(text);
          else if (toast.message) toast.message(text);
          else toast(text);
        } else {
          const { toast } = await import('sonner-native');
          toast?.show({
            description: text,
            type: variant === 'error' ? 'error' : variant === 'success' ? 'success' : 'info',
          });
        }
      } catch (err) {
        // Toast is best-effort; keep inline StatusMessage as primary UX.
        console.warn('Toast notification unavailable', err);
      }
    },
    [defaultToast]
  );

  const clear = useCallback(() => setMessage(null), []);

  return { message, notify, clear };
};

