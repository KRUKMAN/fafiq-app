import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let handlerConfigured = false;

export const ensureNotificationHandler = () => {
  if (handlerConfigured || Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
};
