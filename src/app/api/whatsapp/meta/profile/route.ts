import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { fetchMetaBusinessProfile, updateMetaBusinessProfilePicture } from '@/lib/whatsapp';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/meta/profile
 * Retrieves the WhatsApp Business profile (including DP, name, about, description) from Meta Cloud API.
 */
export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (!whatsappAccount || !whatsappAccount.phone_number_id || !whatsappAccount.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No Meta WhatsApp account connected'
      }, { status: 404 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const phoneNumberId = whatsappAccount.phone_number_id;

    const result = await fetchMetaBusinessProfile(phoneNumberId, accessToken);
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch WhatsApp Business profile'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      profile: result.profile
    });

  } catch (err: any) {
    console.error('[Meta Profile GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/meta/profile
 * Updates the WhatsApp Business profile picture (DP) with image validation and Meta Resumable Upload.
 */
export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (!whatsappAccount || !whatsappAccount.phone_number_id || !whatsappAccount.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No Meta WhatsApp account connected'
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    // 1. Validate MIME type
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const mimeType = file.type || 'image/jpeg';
    if (!validMimes.includes(mimeType.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Meta requires JPG or PNG format.'
      }, { status: 400 });
    }

    // 2. Validate file size (Meta max 5MB for profile pictures)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const accessToken = decrypt(whatsappAccount.access_token);
    const phoneNumberId = whatsappAccount.phone_number_id;

    console.log(`[Meta Profile API] Updating DP for phone_number_id ${phoneNumberId} (size: ${buffer.length} bytes, mime: ${mimeType})...`);

    const uploadResult = await updateMetaBusinessProfilePicture(
      phoneNumberId,
      accessToken,
      buffer,
      mimeType
    );

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Failed to update WhatsApp Business profile picture'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business profile picture updated successfully!',
      profile_picture_url: uploadResult.profile_picture_url
    });

  } catch (err: any) {
    console.error('[Meta Profile POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
