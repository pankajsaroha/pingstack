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

/**
 * Validates whether a given raw value is a valid phone number.
 * - Minimum 10 digits (after normalization or prepending country code)
 * - Maximum 15 digits (ITU-T E.164 standard)
 * - Must NOT be short numbers/IDs (e.g. 10, 8, 12, 12345, 12345678)
 */
export function isValidPhoneNumber(phone: string | number, defaultCountryCode = '91'): boolean {
  if (phone === null || phone === undefined) return false;
  const raw = String(phone).trim();
  if (!raw) return false;

  const normalized = normalizePhoneNumber(raw, defaultCountryCode);
  if (normalized.length < 10 || normalized.length > 15) {
    return false;
  }

  return /^[1-9]\d{9,14}$/.test(normalized);
}

/**
 * Known strong phone header patterns.
 */
const STRONG_PHONE_HEADER_REGEX = /^(phone|phone_number|phonenumber|phone_no|phoneno|mobile|mobile_number|mobilenumber|mobile_no|mobileno|contact|contact_number|contactnumber|contact_no|contactno|whatsapp|whatsapp_number|whatsappnumber|whatsapp_no|whatsappno|wa_number|wa_no|wanumber|wano|cell|cell_number|cellnumber|cellphone|telephone|tel)$/i;

const PHONE_SUBSTRING_REGEX = /(phone|mobile|whatsapp|contact_no|contact_number|contactno|contactnumber|phone_no|phone_number)/i;

/**
 * Evaluates how likely a column header is to represent a phone number.
 * Returns a score: 100 (exact/strong match), 60 (substring match), 0 (none).
 */
export function scorePhoneHeader(header: string): number {
  if (!header) return 0;
  const clean = header.trim().toLowerCase().replace(/[\s\-_.]+/g, '_');
  const compact = clean.replace(/_/g, '');

  if (STRONG_PHONE_HEADER_REGEX.test(clean) || STRONG_PHONE_HEADER_REGEX.test(compact)) {
    return 100;
  }
  if (PHONE_SUBSTRING_REGEX.test(clean)) {
    return 60;
  }
  return 0;
}

/**
 * Two-stage phone column detector across headers and data rows.
 * Stage 1: Strong header match + data validation
 * Stage 2: Data-based phone ratio validation (>= 50% valid 10-15 digit phone numbers)
 */
export function detectPhoneColumn(
  headers: string[],
  rows: Record<string, any>[] | any[][],
  isMatrix = false
): {
  detectedHeader: string;
  detectedIndex: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
} {
  if (!headers || headers.length === 0) {
    return { detectedHeader: '', detectedIndex: -1, confidence: 'none' };
  }

  // Calculate statistics for each column
  const columnStats = headers.map((header, colIdx) => {
    const headerScore = scorePhoneHeader(header);
    let totalNonEmpty = 0;
    let validPhoneCount = 0;

    const sampleLimit = Math.min(rows.length, 100);
    for (let r = 0; r < sampleLimit; r++) {
      const row = rows[r];
      const val = isMatrix ? (row as any[])[colIdx] : (row as Record<string, any>)[header];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        totalNonEmpty++;
        if (isValidPhoneNumber(val)) {
          validPhoneCount++;
        }
      }
    }

    const validRatio = totalNonEmpty > 0 ? validPhoneCount / totalNonEmpty : 0;

    return {
      header,
      colIdx,
      headerScore,
      totalNonEmpty,
      validPhoneCount,
      validRatio,
    };
  });

  // 1. High confidence: Strong header + valid data (or empty file)
  const strongHeaderAndData = columnStats.find(
    (c) => c.headerScore === 100 && (c.validRatio >= 0.5 || c.totalNonEmpty === 0)
  );
  if (strongHeaderAndData) {
    return {
      detectedHeader: strongHeaderAndData.header,
      detectedIndex: strongHeaderAndData.colIdx,
      confidence: 'high',
    };
  }

  // 2. High/Medium confidence: Strong header even if mixed data
  const strongHeader = columnStats.find((c) => c.headerScore === 100);
  if (strongHeader) {
    return {
      detectedHeader: strongHeader.header,
      detectedIndex: strongHeader.colIdx,
      confidence: strongHeader.validPhoneCount > 0 ? 'high' : 'medium',
    };
  }

  // 3. Medium confidence: Moderate header substring + valid data
  const moderateHeaderAndData = columnStats.find(
    (c) => c.headerScore >= 60 && c.validRatio >= 0.5
  );
  if (moderateHeaderAndData) {
    return {
      detectedHeader: moderateHeaderAndData.header,
      detectedIndex: moderateHeaderAndData.colIdx,
      confidence: 'medium',
    };
  }

  // 4. Fallback (Data-only): Any column with at least 50% valid phone numbers and at least 1 valid count
  const dataCandidate = columnStats
    .filter((c) => c.validRatio >= 0.5 && c.validPhoneCount >= 1)
    .sort((a, b) => b.validPhoneCount - a.validPhoneCount)[0];

  if (dataCandidate) {
    return {
      detectedHeader: dataCandidate.header,
      detectedIndex: dataCandidate.colIdx,
      confidence: 'low',
    };
  }

  // 5. No valid phone column found
  return {
    detectedHeader: headers[0] || '',
    detectedIndex: 0,
    confidence: 'none',
  };
}
