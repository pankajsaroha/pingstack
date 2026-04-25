import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';
import { PLANS, PlanType } from '@/lib/plans';

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId: rawId } = await params;
  const contactId = rawId?.trim();
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string;
    const fileName = formData.get('fileName') as string;
    const caption = formData.get('caption') as string || '';

    if (!file || !mediaType) {
      return NextResponse.json({ error: 'Missing file or media details' }, { status: 400 });
    }

    const fileSize = file.size;

    // 1. Get Tenant and Plan
    const { data: tenant, error: tError } = await db.from('tenants')
      .select('id, plan_type, storage_usage_bytes')
      .eq('id', tenantId)
      .single();

    if (tError || !tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const planLimits = PLANS[(tenant.plan_type || 'starter') as PlanType];
    const currentUsageBytes = Number(tenant.storage_usage_bytes || 0);
    const maxSizeBytes = planLimits.maxStorageMb * 1024 * 1024;

    // 2. Check Plan Limits
    const maxFileBytes = planLimits.maxFileSizeMb * 1024 * 1024;
    if (fileSize > maxFileBytes) {
      return NextResponse.json({ 
        error: `File too large. Your plan allows up to ${planLimits.maxFileSizeMb}MB per file.` 
      }, { status: 413 });
    }

    if (currentUsageBytes + fileSize > maxSizeBytes) {
      return NextResponse.json({ 
        error: `Storage quota exceeded. You have ${Math.round(currentUsageBytes / 1024 / 1024)}MB / ${planLimits.maxStorageMb}MB used.` 
      }, { status: 403 });
    }

    // 3. Upload to Supabase Storage (Server-Side)
    const storageFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `${tenant.id}/${storageFileName}`;
    
    const { error: uploadError } = await db.storage
      .from('chat-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 4. Get contact info and check 24h window
    const { data: contact } = await db.from('contacts')
      .select('phone_number, last_received_at')
      .eq('id', contactId)
      .single();

    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    // 24 Hour Window Check
    const lastInbound = contact.last_received_at ? new Date(contact.last_received_at) : null;
    const now = new Date();
    const isWindowClosed = !lastInbound || (now.getTime() - lastInbound.getTime() > 24 * 60 * 60 * 1000);

    if (isWindowClosed) {
      return NextResponse.json({ 
        error: 'The 24-hour window for free-form messages is closed. Please send a template message first.',
        code: 'WINDOW_CLOSED'
      }, { status: 403 });
    }

    // 5. Create message record
    const { data: msg, error: mError } = await db.from('messages').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: contact.phone_number,
      direction: 'outbound',
      content: caption || '',
      message_type: mediaType,
      media_path: filePath,
      media_size_bytes: fileSize,
      status: 'pending'
    }).select().single();

    if (mError) throw mError;

    // 6. Update tenant storage tally
    await db.from('tenants')
      .update({ storage_usage_bytes: currentUsageBytes + fileSize })
      .eq('id', tenantId);

    // 7. Queue the job
    await messageQueue.add('send-whatsapp', {
      messageId: msg.id,
      phone: contact.phone_number,
      isMedia: true,
      mediaType,
      mediaPath: filePath,
      caption: caption,
      fileName: fileName
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    console.error('Attachment Controller Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
