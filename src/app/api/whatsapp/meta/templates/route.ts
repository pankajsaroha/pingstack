import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get Meta Credentials
    const { data: whatsappAccount, error: wError } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (wError || !whatsappAccount) {
      return NextResponse.json({ error: 'Meta account not connected.' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const wabaId = whatsappAccount.business_id;

    // 2. Fetch templates from Meta
    const metaUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
    const metaRes = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const metaData = await metaRes.json();

    if (metaData.error) {
      return NextResponse.json({ error: metaData.error.message }, { status: 400 });
    }

    const metaTemplates = metaData.data || [];

    // 3. Sync with local DB
    // We update statuses for existing templates
    for (const mt of metaTemplates) {
       await db.from('templates')
         .update({ 
           status: mt.status,
           category: mt.category,
           language: mt.language
         })
         .eq('tenant_id', tenantId)
         .eq('name', mt.name);
    }

    // Return the updated templates from our DB
    const { data: updatedTemplates } = await db
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    return NextResponse.json(updatedTemplates);

  } catch (err: any) {
    console.error('Meta Template Sync Error:', err);
    return NextResponse.json({ error: 'Sync failed', message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, language, category, bodyText } = await req.json();

    if (!name || !language || !category || !bodyText) {
      return NextResponse.json({ error: 'Missing required fields (name, language, category, bodyText)' }, { status: 400 });
    }

    // 1. Get Meta Credentials
    const { data: whatsappAccount, error: wError } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .single();

    if (wError || !whatsappAccount) {
      return NextResponse.json({ error: 'Meta account not connected. Please connect from the Dashboard.' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const wabaId = whatsappAccount.business_id;

    // 2. Call Meta API to create template
    // POST /v19.0/{WABA_ID}/message_templates
    const metaUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
    
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        language,
        category,
        components: [
          {
            type: 'BODY',
            text: bodyText
          }
        ]
      })
    });

    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error('Meta Template API Error:', metaData.error);
      return NextResponse.json({ error: metaData.error.message || 'Meta API Error' }, { status: 400 });
    }

    // 3. Store in DB
    const { data: template, error: dbError } = await db
      .from('templates')
      .insert({
        tenant_id: tenantId,
        name,
        template_id: metaData.id, // Meta template ID
        content: bodyText, // Store body as content for backwards compatibility
        status: 'PENDING',
        language,
        category
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Store Template Error:', dbError);
      return NextResponse.json({ error: 'Template created on Meta but failed to store locally.' }, { status: 500 });
    }

    return NextResponse.json(template);

  } catch (err: any) {
    console.error('Meta Template Processing Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
