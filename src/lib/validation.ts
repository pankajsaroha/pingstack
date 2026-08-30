/**
 * Input Schema Validation and Payload Bounds Helpers
 * Protects endpoints from oversized payloads, DOS attacks, and malformed types.
 */

import { NextResponse } from 'next/server';

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB default ceiling
const MAX_BATCH_ITEMS = 5000; // Max direct contacts / IDs allowed per campaign batch

/**
 * Validates request Content-Length header against max allowed payload size.
 */
export function validatePayloadSize(req: Request, maxBytes: number = MAX_PAYLOAD_BYTES): { valid: boolean; response?: NextResponse } {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      response: NextResponse.json(
        { error: `Payload too large. Maximum allowed request size is ${maxMb}MB.` },
        { status: 413 }
      ),
    };
  }
  return { valid: true };
}

/**
 * Sanitizes input strings to strip unsafe control characters.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Remove null bytes and control characters except newlines/tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Campaign Send Payload Schema Validator
 */
export interface CampaignSendPayload {
  campaignId: string;
  groupIds?: string[];
  contactIds?: string[];
  directData?: Array<{ phone: string; variables?: string[] }>;
  templateVariables?: Record<string, string>;
}

export function validateCampaignSendPayload(body: any): { valid: boolean; data?: CampaignSendPayload; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid payload body. JSON object expected.' };
  }

  const campaignId = sanitizeString(body.campaignId);
  if (!campaignId) {
    return { valid: false, error: 'campaignId is required and must be a valid string.' };
  }

  let groupIds: string[] | undefined;
  if (body.groupIds !== undefined) {
    if (!Array.isArray(body.groupIds)) {
      return { valid: false, error: 'groupIds must be an array of strings.' };
    }
    if (body.groupIds.length > MAX_BATCH_ITEMS) {
      return { valid: false, error: `groupIds array exceeds maximum allowed limit of ${MAX_BATCH_ITEMS}.` };
    }
    groupIds = body.groupIds.map((g: any) => sanitizeString(g)).filter(Boolean);
  }

  let contactIds: string[] | undefined;
  if (body.contactIds !== undefined) {
    if (!Array.isArray(body.contactIds)) {
      return { valid: false, error: 'contactIds must be an array of strings.' };
    }
    if (body.contactIds.length > MAX_BATCH_ITEMS) {
      return { valid: false, error: `contactIds array exceeds maximum allowed limit of ${MAX_BATCH_ITEMS}.` };
    }
    contactIds = body.contactIds.map((c: any) => sanitizeString(c)).filter(Boolean);
  }

  let templateVariables: Record<string, string> | undefined;
  if (body.templateVariables && typeof body.templateVariables === 'object') {
    templateVariables = {};
    for (const [k, v] of Object.entries(body.templateVariables)) {
      templateVariables[sanitizeString(k)] = sanitizeString(v);
    }
  }

  let directData: Array<{ phone: string; variables?: string[] }> | undefined;
  if (body.directData !== undefined && body.directData !== null) {
    if (!Array.isArray(body.directData)) {
      return { valid: false, error: 'directData must be an array of contact objects.' };
    }
    if (body.directData.length > MAX_BATCH_ITEMS) {
      return { valid: false, error: `directData array exceeds maximum allowed batch limit of ${MAX_BATCH_ITEMS} rows.` };
    }

    directData = [];
    for (const item of body.directData) {
      if (!item || typeof item !== 'object') continue;
      const phone = sanitizeString(item.phone).replace(/\D/g, '');
      if (!phone) continue;

      const variables = Array.isArray(item.variables)
        ? item.variables.map((v: any) => sanitizeString(v))
        : undefined;

      directData.push({ phone, variables });
    }
  }

  return {
    valid: true,
    data: {
      campaignId,
      groupIds,
      contactIds,
      directData,
      templateVariables
    }
  };
}
