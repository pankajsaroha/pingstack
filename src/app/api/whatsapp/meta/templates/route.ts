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

    // 2. Resolve all candidate WABA IDs (primary WABA, phone asset WABA, user WABAs, and portfolio WABAs)
    const targetWabaIds = new Set<string>();
    if (wabaId) targetWabaIds.add(wabaId);

    // 2a. If phone_number_id is present, resolve exact WABA ID attached to the phone asset
    if (whatsappAccount.phone_number_id) {
      try {
        const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${whatsappAccount.phone_number_id}?fields=whatsapp_business_account`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const phoneData = await phoneRes.json();
        if (phoneData.whatsapp_business_account?.id) {
          targetWabaIds.add(phoneData.whatsapp_business_account.id);
        }
      } catch (phoneErr) {
        console.warn('[Templates Sync] Phone WABA lookup warning:', phoneErr);
      }
    }

    // 2b. Discover user WABAs via /me/whatsapp_business_accounts
    try {
      const meWabaRes = await fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,name`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const meWabaData = await meWabaRes.json();
      if (Array.isArray(meWabaData.data)) {
        for (const item of meWabaData.data) {
          if (item.id) targetWabaIds.add(item.id);
        }
      }
    } catch (meErr) {
      console.warn('[Templates Sync] me WABA lookup warning:', meErr);
    }

    // 2c. Discover portfolio WABAs if portfolioId exists
    const bizId = portfolioId || whatsappAccount.portfolio_id;
    if (bizId) {
      try {
        const bizRes = await fetch(`https://graph.facebook.com/v19.0/${bizId}?fields=owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const bizData = await bizRes.json();
        const owned = bizData.owned_whatsapp_business_accounts?.data || [];
        const client = bizData.client_whatsapp_business_accounts?.data || [];
        for (const item of [...owned, ...client]) {
          if (item.id) targetWabaIds.add(item.id);
        }
      } catch (bizErr) {
        console.warn('[Templates Sync] portfolio WABA lookup warning:', bizErr);
      }
    }

    console.log(`[Templates Sync] Target WABA IDs for template discovery:`, Array.from(targetWabaIds));
    const fields = 'name,status,language,components,category';
    const allFetchedTemplates: MetaTemplate[] = [];

    // 2d. Fetch all template pages for each discovered WABA ID
    for (const currentWabaId of Array.from(targetWabaIds)) {
      try {
        let pageUrl: string | null = `https://graph.facebook.com/v19.0/${currentWabaId}/message_templates?fields=${fields}&limit=100`;

        while (pageUrl) {
          const pageRes: Response = await fetch(pageUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const pageData: any = await pageRes.json();

          if (pageData.error) {
            console.error(`[Templates Sync] Meta API Error for WABA ${currentWabaId}:`, pageData.error);
            break;
          }

          if (Array.isArray(pageData.data)) {
            console.log(`[Templates Sync] Fetched ${pageData.data.length} template(s) from WABA ${currentWabaId}`);
            allFetchedTemplates.push(...pageData.data);
          }

          pageUrl = pageData.paging?.next || null;
        }
      } catch (fetchErr) {
        console.error(`[Templates Sync] Error fetching templates for WABA ${currentWabaId}:`, fetchErr);
      }
    }

    // Deduplicate fetched templates by name and language
    const seen = new Set<string>();
    const templates: MetaTemplate[] = allFetchedTemplates.filter(t => {
      const key = `${t.name}:${t.language || 'en'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[Templates Sync] Total unique live templates fetched from Meta: ${templates.length}`);

    // 3. Upsert live Meta templates into local database
    for (const mt of templates) {
      const bodyComponent = mt.components?.find((component) => component.type.toUpperCase() === 'BODY');
      const bodyText = bodyComponent?.text || '';

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

    // 4. Safe Cleanup: Compare & delete local templates removed from Meta portal
    if (templates.length > 0) {
      const liveMetaNames = new Set(templates.map(t => t.name));

      const { data: existingLocal } = await db
        .from('templates')
        .select('id, name')
        .eq('tenant_id', tenantId);

      const deletedTemplateIds = (existingLocal || [])
        .filter(t => t.name && !liveMetaNames.has(t.name))
        .map(t => t.id);

      if (deletedTemplateIds.length > 0) {
        console.log(`[Templates Sync] Deleting ${deletedTemplateIds.length} template(s) removed from Meta portal:`, deletedTemplateIds);
        await db.from('templates').delete().in('id', deletedTemplateIds);
      }
    } else {
      console.warn(`[Templates Sync] Meta API returned 0 templates or fetch failed. Skipping local DB cleanup to protect existing data.`);
    }

    // 5. Invalidate template cache
    try {
      const { invalidateTemplatesCache } = await import('@/lib/server/templates');
      await invalidateTemplatesCache(tenantId);
    } catch (cacheErr) {
      console.warn('Template cache invalidation warning:', cacheErr);
    }

    // Return the updated templates for tenant from DB
    const { data: updatedTemplates } = await db
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      templates: updatedTemplates || [],
      portfolioId: whatsappAccount.portfolio_id || portfolioId
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
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

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
