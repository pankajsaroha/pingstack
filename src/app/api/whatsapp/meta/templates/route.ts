import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

type MetaTemplateComponent = {
  type: string;
  text?: string;
};

type MetaTemplate = {
  id: string;
  name: string;
  status?: string;
  category?: string;
  language?: string;
  components?: MetaTemplateComponent[];
};

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
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
    if (!whatsappAccount.access_token) {
      return NextResponse.json({ error: 'Meta access token missing. Please reconnect Meta.' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const wabaId = whatsappAccount.business_id;
    let portfolioId = whatsappAccount.portfolio_id;

    if (!wabaId) {
      return NextResponse.json({
        error: 'SETUP_INCOMPLETE',
        message: 'No WhatsApp Business Account is selected yet. Complete setup by choosing a WABA and phone number.'
      }, { status: 400 });
    }

    // 2. Fetch templates from Meta (Try WABA ID first)
    const baseUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
    const fields = 'name,status,language,components,category';
    console.log(`[Templates] Syncing from WABA: ${wabaId}`);
    
    // Debug: Check exactly what tasks this token can perform on WABAs
    const taskCheckRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=name,id,tasks`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const taskCheck = await taskCheckRes.json();
    console.log(`[Templates] Token Task Check:`, JSON.stringify(taskCheck));

    // Debug: Check Token Scopes
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const scopeCheckRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
    const scopeCheck = await scopeCheckRes.json();
    console.log(`[Templates] Token Scopes:`, JSON.stringify(scopeCheck.data?.scopes));

    // Debug: Try to fetch the namespace and see if hello_world is hidden
    const debugWabaRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}?fields=message_template_namespace,name`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const debugWaba = await debugWabaRes.json();
    console.log(`[Templates] WABA Debug Info:`, JSON.stringify(debugWaba));

    const res = await fetch(`${baseUrl}?fields=${fields}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const metaData = await res.json();
    console.log(`[Templates] Meta Raw Response:`, JSON.stringify(metaData));

    if (metaData.error) {
      console.error(`[Templates] Meta API Error:`, metaData.error);
      return NextResponse.json({ 
        error: metaData.error.message || 'Meta API Error',
        code: metaData.error.code,
        fbtrace_id: metaData.error.fbtrace_id
      }, { status: 400 });
    }

    let templates = (metaData.data || []) as MetaTemplate[];

    // Probe for hello_world specifically
    if (templates.length === 0) {
      console.log(`[Templates] Standard list empty. Probing for 'hello_world' specifically...`);
      const probeRes = await fetch(`${baseUrl}?name=hello_world&fields=${fields}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const probeData = await probeRes.json();
      console.log(`[Templates] 'hello_world' Probe Result:`, JSON.stringify(probeData));
      if (probeData.data?.length > 0) {
        templates = probeData.data;
      }
    }

    // FALLBACK: If WABA returns nothing, try a deep scan of all accessible assets
    if (templates.length === 0) {
      console.log(`[Templates] Deep scanning accessible assets...`);
      
      const [accountsRes, bizRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v19.0/me/accounts`, { headers: { 'Authorization': `Bearer ${accessToken}` } }).then(r => r.json()),
        fetch(`https://graph.facebook.com/v19.0/me?fields=businesses`, { headers: { 'Authorization': `Bearer ${accessToken}` } }).then(r => r.json())
      ]);

      console.log(`[Templates] Accessible Accounts:`, JSON.stringify(accountsRes));
      console.log(`[Templates] Accessible Businesses:`, JSON.stringify(bizRes));

      // Try to find the Portfolio ID from the WABA details if we haven't yet
      const wabaDetailRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}?fields=owner_business_info`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const wabaDetail = await wabaDetailRes.json();
      portfolioId = wabaDetail.owner_business_info?.id;

      if (portfolioId) {
        console.log(`[Templates] Syncing from Portfolio: ${portfolioId}`);
        // Try both possible endpoints for templates on a business/WABA
        const bizTemplates = await fetch(`https://graph.facebook.com/v19.0/${portfolioId}/message_templates`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(r => r.json());
        console.log(`[Templates] Portfolio Template Response:`, JSON.stringify(bizTemplates));
        if (bizTemplates.data) templates = bizTemplates.data;
      }
    }

    console.log(`[Templates] Final count to sync: ${templates.length}`);

    // 3. Sync with local DB (Upsert)
    for (const mt of templates) {
      const bodyComponent = mt.components?.find((component) => component.type.toUpperCase() === 'BODY');
      const bodyText = bodyComponent?.text || '';

      // Check if exists
      const { data: existing } = await db
        .from('templates')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', mt.name)
        .maybeSingle();

      if (existing) {
        await db.from('templates')
          .update({
            status: mt.status,
            category: mt.category,
            language: mt.language,
            content: bodyText,
            template_id: mt.id
          })
          .eq('id', existing.id);
      } else {
        await db.from('templates')
          .insert({
            tenant_id: tenantId,
            name: mt.name,
            status: mt.status,
            category: mt.category,
            language: mt.language,
            content: bodyText,
            template_id: mt.id
          });
      }
    }

    // Return the updated templates from our DB
    const { data: updatedTemplates } = await db
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      templates: updatedTemplates,
      portfolioId: whatsappAccount.portfolio_id || portfolioId // Use stored or discovered ID
    });

  } catch (err: unknown) {
    console.error('Meta Template Sync Error:', err);
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: 'Sync failed', message }, { status: 500 });
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
      return NextResponse.json({
        error: 'Template created on Meta but failed to store locally.',
        dbError: dbError
      }, { status: 500 });
    }

    return NextResponse.json(template);

  } catch (err: unknown) {
    console.error('Meta Template Processing Error:', err);
    const message = err instanceof Error ? err.message : 'Template processing failed';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}
