/**
 * Phone Number Normalization Utility
 * Rule:
 * 1. Remove '+' at start if present
 * 2. Strip non-digit characters
 * 3. Prepend default country code '91' (India) if number is 10 digits without country code
 */
export function normalizePhoneNumber(phone: string | number, defaultCountryCode = '91'): string {
  if (phone === null || phone === undefined) return '';
  let cleaned = String(phone).trim();

  // Remove '+' at the start if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');

  // If 10-digit number (e.g. 9876543210), prepend default country code '91'
  if (cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}
