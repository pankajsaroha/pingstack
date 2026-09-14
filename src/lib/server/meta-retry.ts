/**
 * Meta Graph API Transient Retry Engine
 * Provides bounded retries with exponential backoff & jitter for safe transient errors.
 * Strictly fast-fails non-retryable errors (authentication, permissions, invalid IDs).
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  operationName?: string;
}

export interface MetaApiErrorDetails {
  status?: number;
  code?: number;
  subcode?: number;
  message?: string;
  isTransient: boolean;
  retryAfterSeconds?: number;
}

/**
 * Determine whether a Meta error response is transient (retryable) or permanent (fast-fail).
 */
export function classifyMetaError(status: number, responseBody?: any): MetaApiErrorDetails {
  const errorObj = responseBody?.error || {};
  const code = errorObj.code;
  const subcode = errorObj.error_subcode;
  const message = errorObj.message || (typeof responseBody === 'string' ? responseBody : `HTTP ${status}`);

  // Non-retryable Meta error codes:
  // 190: Invalid / expired OAuth access token
  // 200-299: Permission / capability errors
  // 100: Invalid parameter / entity does not exist
  // 135000: Phone number already registered with Cloud API
  const nonRetryableCodes = new Set([100, 190, 200, 210, 298, 135000, 368]);
  const nonRetryableSubcodes = new Set([463, 467, 490]); // Expired session subcodes

  if (code && nonRetryableCodes.has(code)) {
    return { status, code, subcode, message, isTransient: false };
  }

  if (subcode && nonRetryableSubcodes.has(subcode)) {
    return { status, code, subcode, message, isTransient: false };
  }

  // Non-retryable HTTP 4xx statuses (Client Errors)
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return { status, code, subcode, message, isTransient: false };
  }

  // Retryable HTTP statuses:
  // 429: Rate limited
  // 500: Meta internal server error
  // 502: Bad Gateway
  // 503: Service Unavailable
  // 504: Gateway Timeout
  if (status === 429 || (status >= 500 && status <= 599)) {
    let retryAfterSeconds: number | undefined;
    if (status === 429 && errorObj.retry_after) {
      retryAfterSeconds = Number(errorObj.retry_after) || 1;
    }
    return { status, code, subcode, message, isTransient: true, retryAfterSeconds };
  }

  // Fallback: Network or unexpected errors are considered transient
  return { status, code, subcode, message, isTransient: true };
}

/**
 * Execute a Meta fetch with automated transient retries.
 */
export async function fetchWithMetaRetry(
  url: string,
  options: RequestInit = {},
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const maxRetries = retryOpts.maxRetries ?? 3;
  const initialDelayMs = retryOpts.initialDelayMs ?? 150;
  const maxDelayMs = retryOpts.maxDelayMs ?? 2000;
  const multiplier = retryOpts.backoffMultiplier ?? 2.0;
  const opName = retryOpts.operationName || 'meta_api_call';

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, options);

      // If response is OK, return immediately
      if (response.ok) {
        return response;
      }

      // If last attempt, return response as-is (caller will parse error)
      if (attempt > maxRetries) {
        return response;
      }

      // Clone response to inspect body without consuming the main stream
      let bodyData: any = null;
      try {
        const cloned = response.clone();
        bodyData = await cloned.json();
      } catch {
        // body wasn't JSON
      }

      const classified = classifyMetaError(response.status, bodyData);

      // Fast-fail if not transient
      if (!classified.isTransient) {
        return response;
      }

      // Calculate backoff delay with random jitter (±20%)
      const jitter = 0.8 + Math.random() * 0.4;
      const waitTimeMs = classified.retryAfterSeconds
        ? Math.min(maxDelayMs, classified.retryAfterSeconds * 1000)
        : Math.min(maxDelayMs, Math.round(delay * jitter));

      console.warn(`[MetaRetry] ${opName} failed with HTTP ${response.status}. Retrying in ${waitTimeMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      delay = delay * multiplier;

    } catch (networkErr: any) {
      if (attempt > maxRetries) {
        throw networkErr;
      }
      const jitter = 0.8 + Math.random() * 0.4;
      const waitTimeMs = Math.min(maxDelayMs, Math.round(delay * jitter));
      console.warn(`[MetaRetry] ${opName} network error: ${networkErr?.message || networkErr}. Retrying in ${waitTimeMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      delay = delay * multiplier;
    }
  }

  throw new Error(`[MetaRetry] ${opName} exceeded maximum retry attempts (${maxRetries})`);
}
