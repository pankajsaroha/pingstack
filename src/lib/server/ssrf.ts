/**
 * Server-Side Request Forgery (SSRF) Protection for Developer Webhooks
 * Validates that user-provided URLs do not point to localhost, private IP spaces, or cloud metadata endpoints.
 */

const PRIVATE_IP_RANGES = [
  /^127\./,                          // 127.0.0.0/8 (Loopback)
  /^10\./,                           // 10.0.0.0/8 (Private network)
  /^192\.168\./,                     // 192.168.0.0/16 (Private network)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 (Private network)
  /^169\.254\./,                     // 169.254.0.0/16 (Link-local & AWS/GCP Metadata 169.254.169.254)
  /^0\./,                            // 0.0.0.0/8
  /^fc00:/i,                         // IPv6 unique local
  /^fe80:/i,                         // IPv6 link-local
  /^::1$/,                           // IPv6 loopback
];

const DISALLOWED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
  'kubernetes.default.svc',
];

export function isSafeWebhookUrl(rawUrl: string): { safe: boolean; reason?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Malformed URL format' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { safe: false, reason: 'Only HTTP and HTTPS protocols are permitted' };
  }

  // In production, strongly recommend HTTPS (allow HTTP for testing if explicitly enabled)
  const hostname = parsed.hostname.toLowerCase();

  // Check disallowed hostnames
  if (DISALLOWED_HOSTNAMES.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return { safe: false, reason: 'Webhook URL cannot point to localhost or internal network hosts' };
  }

  // Check private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return { safe: false, reason: 'Webhook URL cannot point to private or link-local IP addresses' };
    }
  }

  return { safe: true };
}
