type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const DEFAULT_REDACT_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'api_key',
  'apikey',
  'secret',
  'supabase_anon_key',
  'supabaseanonkey',
  'anon_key',
]);

const normalizeLogLevel = (raw: unknown): LogLevel => {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error' || value === 'silent') {
    return value;
  }
  return __DEV__ ? 'debug' : 'warn';
};

const activeLevel: LogLevel = normalizeLogLevel(process.env.EXPO_PUBLIC_LOG_LEVEL);

const shouldLog = (level: LogLevel) => LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[activeLevel];

const truncateString = (value: string, max = 1000) => (value.length > max ? `${value.slice(0, max)}…` : value);

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return '[redacted_depth_limit]';
  if (typeof value === 'string') return truncateString(value);
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;

  const entries = Object.entries(value as Record<string, unknown>);
  const out: Record<string, unknown> = {};
  for (const [key, child] of entries.slice(0, 50)) {
    if (DEFAULT_REDACT_KEYS.has(key.toLowerCase())) out[key] = '[redacted]';
    else out[key] = redact(child, depth + 1);
  }
  if (entries.length > 50) out._truncated = true;
  return out;
};

const errorInfo = (err: unknown) => {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: truncateString(err.message, 2000),
      stack: __DEV__ ? truncateString(err.stack ?? '', 4000) : undefined,
    };
  }
  if (typeof err === 'object') {
    const maybeMessage = (err as any).message;
    const maybeCode = (err as any).code;
    return {
      name: (err as any).name ? String((err as any).name) : 'Error',
      message: typeof maybeMessage === 'string' ? truncateString(maybeMessage, 2000) : truncateString(JSON.stringify(redact(err)), 2000),
      code: typeof maybeCode === 'string' || typeof maybeCode === 'number' ? maybeCode : undefined,
    };
  }
  return { name: 'Error', message: truncateString(String(err), 2000) };
};

type LogFields = Record<string, unknown>;

const emit = (level: LogLevel, message: string, fields?: LogFields) => {
  if (!shouldLog(level)) return;

  const base = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };

  const payload = fields ? { ...base, ...redact(fields) } : base;

  if (__DEV__) {
    // Prefer readable dev output; keep structure as the last argument.
    const fn = level === 'debug' ? console.debug : level === 'info' ? console.info : level === 'warn' ? console.warn : console.error;
    fn(message, fields ? redact(fields) : undefined);
    return;
  }

  const fn = level === 'debug' ? console.debug : level === 'info' ? console.info : level === 'warn' ? console.warn : console.error;
  fn(JSON.stringify(payload));
};

export const logger = {
  debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
  info: (message: string, fields?: LogFields) => emit('info', message, fields),
  warn: (message: string, fields?: LogFields & { err?: unknown }) =>
    emit('warn', message, { ...fields, err: fields?.err ? errorInfo(fields.err) : undefined }),
  error: (message: string, fields?: LogFields & { err?: unknown }) =>
    emit('error', message, { ...fields, err: fields?.err ? errorInfo(fields.err) : undefined }),
  errorInfo,
};
