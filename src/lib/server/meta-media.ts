import { dbAdmin as db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { fetchWithRetry } from '@/lib/whatsapp';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'text/csv': '.csv',
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/3gpp': '.3gp',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/amr': '.amr',
};

export interface DownloadMediaResult {
  filePath: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
}

/**
 * Downloads media/document from Meta Graph API using tenant credentials and stores it in Supabase Storage.
 */
export async function downloadAndStoreMetaMedia(options: {
  tenantId: string;
  mediaId: string;
  filename?: string | null;
  mimeType?: string | null;
}): Promise<DownloadMediaResult | null> {
  const { tenantId, mediaId, filename: hintFilename, mimeType: hintMimeType } = options;

  if (!db || !tenantId || !mediaId) {
    return null;
  }

  // 1. Fetch tenant WhatsApp credentials
  const { data: waAccount, error: waError } = await db
    .from('whatsapp_accounts')
    .select('access_token')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (waError || !waAccount?.access_token) {
    console.error(`[Meta Media] Missing WhatsApp credentials for tenant ${tenantId}`);
    return null;
  }

  const accessToken = decrypt(waAccount.access_token);
  if (!accessToken) {
    console.error(`[Meta Media] Failed to decrypt access token for tenant ${tenantId}`);
    return null;
  }

  // 2. Fetch Media Metadata URL from Meta Graph API
  const metaUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
  const metaRes = await fetchWithRetry(
    metaUrl,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
    { maxRetries: 2, timeoutMs: 15000 }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text().catch(() => '');
    console.error(`[Meta Media] Failed to retrieve media URL for ${mediaId}: ${metaRes.status} ${errText}`);
    return null;
  }

  const mediaInfo = await metaRes.json();
  const downloadUrl = mediaInfo.url;
  const resolvedMimeType = mediaInfo.mime_type || hintMimeType || 'application/octet-stream';

  if (!downloadUrl) {
    console.error(`[Meta Media] Meta returned no download URL for media ${mediaId}`);
    return null;
  }

  // 3. Download the actual binary file from Meta Lookaside CDN with Bearer token
  const binaryRes = await fetchWithRetry(
    downloadUrl,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
    { maxRetries: 2, timeoutMs: 30000 }
  );

  if (!binaryRes.ok) {
    console.error(`[Meta Media] Failed to fetch binary data from ${downloadUrl}: ${binaryRes.status}`);
    return null;
  }

  const arrayBuffer = await binaryRes.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const fileSize = fileBuffer.byteLength;

  // 4. Resolve clean original filename
  let cleanFilename = hintFilename ? hintFilename.trim().replace(/[^a-zA-Z0-9._-]/g, '_') : '';
  const expectedExt = MIME_EXTENSION_MAP[resolvedMimeType] || '';

  if (!cleanFilename) {
    cleanFilename = `document_${mediaId}${expectedExt}`;
  } else if (expectedExt && !cleanFilename.includes('.')) {
    cleanFilename = `${cleanFilename}${expectedExt}`;
  }

  const storageFileName = `${Date.now()}_${cleanFilename}`;
  const filePath = `${tenantId}/${storageFileName}`;

  // 5. Upload to Supabase Storage 'chat-media'
  const { error: uploadError } = await db.storage
    .from('chat-media')
    .upload(filePath, fileBuffer, {
      contentType: resolvedMimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error(`[Meta Media] Storage upload failed for ${filePath}:`, uploadError);
    return null;
  }

  // 6. Increment Tenant storage usage tally
  try {
    const { data: tenant } = await db
      .from('tenants')
      .select('storage_usage_bytes')
      .eq('id', tenantId)
      .single();

    const currentUsage = Number(tenant?.storage_usage_bytes || 0);
    await db
      .from('tenants')
      .update({ storage_usage_bytes: currentUsage + fileSize })
      .eq('id', tenantId);
  } catch (tErr) {
    console.warn(`[Meta Media] Non-blocking: Failed to update tenant storage usage:`, tErr);
  }

  console.log(`✅ [Meta Media] Successfully stored inbound document: ${filePath} (${fileSize} bytes, mime: ${resolvedMimeType})`);

  return {
    filePath,
    fileSize,
    mimeType: resolvedMimeType,
    originalFilename: cleanFilename,
  };
}
