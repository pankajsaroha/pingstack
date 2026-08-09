/**
 * Light, structured logger with correlation metadata and JSON formatting in production.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  requestId?: string;
  traceId?: string;
  tenantId?: string;
  userId?: string;
  component?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  withContext(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  private format(level: LogLevel, message: string, meta?: LogContext) {
    const isProd = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();
    const mergedMeta = { ...this.context, ...meta };

    if (isProd) {
      // Production: Structured JSON log line
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...mergedMeta,
      });
    }

    // Development: Formatted readable console log
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const ctxString = Object.keys(mergedMeta).length > 0 ? ` | ${JSON.stringify(mergedMeta)}` : '';
    return `${prefix} ${message}${ctxString}`;
  }

  info(message: string, meta?: LogContext) {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: LogContext) {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, error?: unknown, meta?: LogContext) {
    const errMeta = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack, ...meta }
      : { error, ...meta };
    console.error(this.format('error', message, errMeta));
  }

  debug(message: string, meta?: LogContext) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();
