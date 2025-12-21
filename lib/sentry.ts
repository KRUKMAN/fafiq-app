import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Should be called as early as possible in the app lifecycle.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('[Sentry] DSN not configured. Set EXPO_PUBLIC_SENTRY_DSN to enable error tracking.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // Enable in production, disable in dev (or use environment variable)
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true',
    // Environment name
    environment: __DEV__ ? 'development' : 'production',
    // Release tracking (can be set via build process)
    // release: process.env.EXPO_PUBLIC_APP_VERSION,
    // Performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
    // Session replay (optional, can enable later)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in dev unless explicitly enabled
      if (__DEV__ && process.env.EXPO_PUBLIC_SENTRY_ENABLED !== 'true') {
        return null;
      }
      return event;
    },
    // Additional options
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    // Capture unhandled promise rejections
    enableCaptureFailedRequests: true,
  });

  // Note: @sentry/react-native automatically sets up global error handlers
  // for unhandled promise rejections and native crashes
}

/**
 * Set user context for Sentry (call after user logs in)
 */
export function setSentryUser(userId: string | null, email?: string | null, username?: string | null) {
  if (!SENTRY_DSN) return;

  Sentry.setUser(
    userId
      ? {
          id: userId,
          email: email ?? undefined,
          username: username ?? undefined,
        }
      : null
  );
}

/**
 * Set additional context (org, etc.)
 */
export function setSentryContext(key: string, context: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.setContext(key, context);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb({
    message,
    category: category ?? 'default',
    level: level ?? 'info',
    data,
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

