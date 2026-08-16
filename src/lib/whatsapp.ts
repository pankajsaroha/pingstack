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

export const registerMetaPhoneNumber = async (
  phoneNumberId: string,
  accessToken: string,
  pin: string = '123456'
): Promise<{ success: boolean; error?: string }> => {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/register`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin
      })
    });
    const data = await res.json();
    if (res.ok && (data.success || data.id)) {
      console.log(`✅ [Meta API] Successfully registered phone number ID: ${phoneNumberId}`);
      return { success: true };
    }
    console.error(`❌ [Meta API] Registration failed for ${phoneNumberId}:`, data.error);
    return { success: false, error: data.error?.message || 'Failed to register phone number' };
  } catch (err: any) {
    console.error(`❌ [Meta API] Registration exception for ${phoneNumberId}:`, err);
    return { success: false, error: err.message };
  }
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
      const errorCode = data.error?.code;
      const errorSubcode = data.error?.error_subcode;
      const errorMsg = data.error?.message || '';

      // Auto-handle Meta Error #133010 (Account not registered)
      if (errorCode === 133010 || errorSubcode === 133010 || errorMsg.includes('133010') || errorMsg.toLowerCase().includes('not registered')) {
        console.warn(`⚠️ [Meta API] Received error 133010 (Account not registered) for phone ${phoneNumberId}. Executing auto-registration...`);
        const regResult = await registerMetaPhoneNumber(phoneNumberId, accessToken);
        if (regResult.success) {
          console.log(`✅ [Meta API] Auto-registration succeeded for ${phoneNumberId}. Retrying message dispatch...`);
          const retryRes = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: to.replace(/\D/g, ''),
              ...payload
            })
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.messages && retryData.messages.length > 0) {
            return { success: true, messageId: retryData.messages[0].id, status: retryRes.status };
          }
          if (retryData.error?.message) {
            return { success: false, error: `Meta Cloud API error after registration retry: ${retryData.error.message}`, status: retryRes.status };
          }
        } else {
          console.error(`❌ [Meta API] Auto-registration failed for ${phoneNumberId}: ${regResult.error}`);
          return {
            success: false,
            error: `Meta Error #133010 (Phone number not registered). Auto-registration attempt failed: ${regResult.error || 'Unknown error'}. Ensure the number is verified in Meta Business Manager and not active on a mobile phone.`,
            status: res.status
          };
        }
      }

      // Detect Meta Error #131049 (Ecosystem Health & Frequency Capping Protection)
      if (errorCode === 131049 || errorMsg.includes('131049') || errorMsg.toLowerCase().includes('ecosystem health')) {
        return {
          success: false,
          error: `Meta Error #131049 (Ecosystem Health Protection): Meta blocked message delivery to protect user engagement. Key reasons: (1) Meta frequency capping — recipient received recent marketing templates without opening them, (2) If using Meta Test Sandbox Number, recipient number must be added under "To" in Meta Developer Portal (WhatsApp → API Setup), or (3) Recipient opted out / reported messages.`,
          status: res.status
        };
      }

      // Detect Meta WABA Payment Method Errors (e.g., Code 131031 / 131042 / Payment eligibility)
      if (errorCode === 131031 || errorCode === 131042 || errorMsg.toLowerCase().includes('payment') || errorMsg.toLowerCase().includes('eligibility')) {
        return {
          success: false,
          error: `Meta WABA Payment Method Required (#${errorCode || 131031}): Meta Cloud API requires attaching a Payment Method directly to your WhatsApp Business Account (WABA) in Meta Business Manager (Settings → WhatsApp Accounts → Payment Methods).`,
          status: res.status
        };
      }

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

export const fetchMetaPhoneNumberStatus = async (
  phoneNumberId: string,
  accessToken: string
): Promise<{
  status?: string;
  verifiedName?: string;
  verificationStatus?: string;
  qualityRating?: string;
  isApproved: boolean;
  raw?: any;
  error?: string;
}> => {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,status`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (res.ok && data.id) {
      const status = data.status || 'CONNECTED';
      const isApproved = status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'CONNECTED';
      return {
        status,
        verifiedName: data.verified_name,
        verificationStatus: data.code_verification_status,
        qualityRating: data.quality_rating,
        isApproved,
        raw: data
      };
    }
    return { isApproved: false, error: data.error?.message || 'Failed to fetch status' };
  } catch (err: any) {
    return { isApproved: false, error: err.message || 'Network error checking phone status' };
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
