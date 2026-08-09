import { metaCircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Determines whether an HTTP error or Meta Graph API error response is transient and retryable.
 */
export const isRetryableError = (status: number, responseData?: any, errorObj?: any): boolean => {
  // Network failures, aborts, timeouts, connection resets
  if (!status || status === 0 || errorObj?.name === 'AbortError') {
    return true;
  }

  // 429 Too Many Requests or 5xx Server Errors (Meta backend issues)
  if (status === 429 || status >= 500) {
    return true;
  }

  // Check Meta Graph API error codes
  if (responseData?.error) {
    const code = responseData.error.code;
    const subcode = responseData.error.error_subcode;

    // Transient Meta rate limit and server error codes:
    // 1: Unknown error (temporary)
    // 2: Service temporary error
    // 4: Application request limit reached
    // 17: User request limit reached
    // 32: Page-level rate limit
    // 613: Custom rate limit
    // 80007: Rate limit error
    // 130429: Cloud API rate limit hit
    // 131056: Pair rate limit hit
    // 130470: Re-engagement rate limit hit
    const retryableCodes = [1, 2, 4, 17, 32, 613, 80007, 130429, 131056, 130470];
    if (retryableCodes.includes(code) || retryableCodes.includes(subcode)) {
      return true;
    }
  }

  return false;
};

/**
 * Executes a fetch request with circuit breaker protection, exponential backoff, jitter, and timeout per attempt.
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retryOpts: RetryOptions = {}
): Promise<Response> => {
  const maxRetries = retryOpts.maxRetries ?? 3;
  const initialDelayMs = retryOpts.initialDelayMs ?? 1000;
  const maxDelayMs = retryOpts.maxDelayMs ?? 10000;
  const timeoutMs = retryOpts.timeoutMs ?? 20000; // Default 20s timeout per attempt

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check circuit breaker before each attempt
    metaCircuitBreaker.checkState();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.ok) {
        metaCircuitBreaker.recordSuccess();
        return response;
      }

      let responseData: any = null;
      try {
        const cloned = response.clone();
        responseData = await cloned.json();
      } catch {
        // Response body not JSON
      }

      const retryable = isRetryableError(response.status, responseData);
      metaCircuitBreaker.recordFailure(retryable);

      if (attempt < maxRetries && retryable) {
        const backoffDelay = Math.min(
          initialDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
          maxDelayMs
        );
        console.warn(
          `⚠️ [Meta API] Request to ${url} failed with status ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${backoffDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      // Re-throw CircuitBreakerOpenError directly without retrying
      if (err.name === 'CircuitBreakerOpenError') {
        throw err;
      }

      const isTimeout = err.name === 'AbortError';
      const errorMessage = isTimeout ? `Request timed out after ${timeoutMs}ms` : (err.message || 'Network fetch failed');
      const retryable = isRetryableError(0, null, err);

      metaCircuitBreaker.recordFailure(true);

      if (attempt < maxRetries && retryable) {
        const backoffDelay = Math.min(
          initialDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
          maxDelayMs
        );
        console.warn(
          `⚠️ [Meta API] ${isTimeout ? 'Timeout' : 'Network error'} (${errorMessage}) on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${backoffDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      throw new Error(errorMessage);
    }
  }

  if (lastError) throw lastError;
  throw new Error(`Meta API request failed after ${maxRetries} retries`);
};

export const sendMetaWhatsAppMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  payload: any,
  retryOpts?: RetryOptions
): Promise<{ success: boolean; messageId?: string; error?: string; status?: number }> => {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  // Dynamically set timeout: 60s for media uploads/sends, 20s for text/template
  const isMedia = payload.type === 'image' || payload.type === 'video' || payload.type === 'audio' || payload.type === 'document';
  const effectiveTimeout = retryOpts?.timeoutMs ?? (isMedia ? 60000 : 20000);

  try {
    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''), // NORMALIZE: Strip all non-digits (e.g., +, spaces)
          ...payload
        })
      },
      { ...retryOpts, timeoutMs: effectiveTimeout }
    );

    const data = await res.json();

    if (res.ok && data.messages && data.messages.length > 0) {
      return { success: true, messageId: data.messages[0].id, status: res.status };
    } else {
      return {
        success: false,
        error: data.error?.message || `Meta Cloud API error (${res.status})`,
        status: res.status
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error sending WhatsApp message' };
  }
};

export const getWABADetails = async (accessToken: string, retryOpts?: RetryOptions) => {
  const url = `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts`;
  const res = await fetchWithRetry(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }, retryOpts);
  return res.json();
};

export const getSharedWABADetails = async (accessToken: string, retryOpts?: RetryOptions) => {
  const url = `https://graph.facebook.com/v19.0/me/shared_waba_accounts`;
  const res = await fetchWithRetry(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }, retryOpts);
  return res.json();
};

export const getWABAPhoneNumbers = async (wabaId: string, accessToken: string, retryOpts?: RetryOptions) => {
  const url = `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`;
  const res = await fetchWithRetry(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }, retryOpts);
  return res.json();
};

export const subscribeWABAWebhooks = async (wabaId: string, accessToken: string, retryOpts?: RetryOptions) => {
  const url = `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }, retryOpts);
  return res.json();
};

export const sendMetaTemplateMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string = 'en_US',
  components: any[] = [],
  retryOpts?: RetryOptions
) => {
  return sendMetaWhatsAppMessage(phoneNumberId, accessToken, to, {
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components
    }
  }, retryOpts);
};

export const sendMetaTextMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
  retryOpts?: RetryOptions
) => {
  return sendMetaWhatsAppMessage(phoneNumberId, accessToken, to, {
    type: 'text',
    text: { body: text }
  }, retryOpts);
};
