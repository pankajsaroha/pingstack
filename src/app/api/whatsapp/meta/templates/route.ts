import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { generateVariableExamples } from '@/lib/templates';
import { invalidateTemplatesCache } from '@/lib/server/templates';

type MetaTemplateComponent = {
  type: string;
  text?: string;
  example?: any;
};

type MetaTemplate = {
  id: string;
  name: string;
  status?: string;
  category?: string;
  language?: string;
  components?: MetaTemplateComponent[];
  rejected_reason?: string;
  quality_score?: any;
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
    const fields = 'name,status,language,components,category,rejected_reason,quality_score';
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
      const rejectedReason = mt.rejected_reason && mt.rejected_reason !== 'NONE' ? mt.rejected_reason : null;

      const { data: existing } = await db
        .from('templates')
        .select('id, metadata')
        .eq('tenant_id', tenantId)
        .eq('name', mt.name)
        .maybeSingle();

      const metaMetadata = {
        ...(existing?.metadata || {}),
        rejected_reason: mt.status === 'APPROVED' ? null : rejectedReason,
        rejection_reason_code: mt.status === 'APPROVED' ? null : rejectedReason,
        quality_score: mt.quality_score || null,
        last_meta_status_update: new Date().toISOString()
      };

      if (existing) {
        await db.from('templates')
          .update({
            status: mt.status,
            category: mt.category,
            language: mt.language,
            content: bodyText,
            template_id: mt.id,
            metadata: metaMetadata
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
            template_id: mt.id,
            metadata: metaMetadata
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

/**
 * Handle in-place template update / resubmission (PUT or POST with templateId)
 */
export async function PUT(req: Request) {
  return handleTemplateEdit(req);
}

export async function POST(req: Request) {
  const body = await req.json();

  // If request contains templateId or is an edit action, route to in-place edit handler
  if (body.templateId || body.oldTemplateId || body.action === 'edit') {
    return handleTemplateEditWithBody(req, body);
  }

  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { name, language, category, bodyText } = body;

    if (!name || !language || !category || !bodyText) {
      return NextResponse.json({ error: 'Missing required fields (name, language, category, bodyText)' }, { status: 400 });
    }

    // 1. Get Meta Credentials
    const { data: whatsappAccount, error: wError } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (wError || !whatsappAccount) {
      return NextResponse.json({ error: 'Meta account not connected. Please connect from the Dashboard.' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const wabaId = whatsappAccount.business_id;

    const normalizedCategory = String(category).trim().toUpperCase();
    const sampleValues = generateVariableExamples(bodyText);

    // 2. Call Meta API to create new template
    const metaUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;

    const createPayload: any = {
      name,
      language,
      category: normalizedCategory,
      allow_category_change: false,
      components: [
        {
          type: 'BODY',
          text: bodyText,
          ...(sampleValues.length > 0 ? { example: { body_text: [sampleValues] } } : {})
        }
      ]
    };

    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error('Meta Template Create Error:', metaData.error);
      return NextResponse.json({
        error: metaData.error.message || 'Meta API Error: Failed to submit template to Meta.'
      }, { status: 400 });
    }

    // 3. Store new template in local DB with Meta status (defaults to PENDING)
    const initialStatus = metaData.status || 'PENDING';
    const { data: template, error: dbError } = await db
      .from('templates')
      .insert({
        tenant_id: tenantId,
        name,
        template_id: metaData.id,
        content: bodyText,
        status: initialStatus,
        language,
        category: normalizedCategory,
        metadata: {
          rejected_reason: null,
          last_meta_status_update: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Store Template Error:', dbError);
      return NextResponse.json({
        error: 'Template created on Meta but failed to store locally.',
        dbError
      }, { status: 500 });
    }

    await invalidateTemplatesCache(tenantId);
    return NextResponse.json(template);

  } catch (err: unknown) {
    console.error('Meta Template Processing Error:', err);
    const message = err instanceof Error ? err.message : 'Template creation failed';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}

async function handleTemplateEdit(req: Request) {
  try {
    const body = await req.json();
    return handleTemplateEditWithBody(req, body);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid JSON payload: ' + e.message }, { status: 400 });
  }
}

async function handleTemplateEditWithBody(req: Request, body: any) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const targetId = body.templateId || body.id || body.oldTemplateId;
  const { category, bodyText, language } = body;

  if (!targetId || !bodyText) {
    return NextResponse.json({ error: 'Missing target template ID or bodyText' }, { status: 400 });
  }

  try {
    // 1. Fetch existing template from local DB
    const { data: existing, error: findError } = await db
      .from('templates')
      .select('*')
      .eq('id', targetId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!existing.template_id) {
      return NextResponse.json({ error: 'Template lacks a valid Meta ID. Please sync with Meta first.' }, { status: 400 });
    }

    // 2. Fetch Meta credentials
    const { data: whatsappAccount, error: wError } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (wError || !whatsappAccount?.access_token) {
      return NextResponse.json({ error: 'Meta account credentials not found.' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const normalizedCategory = (category || existing.category || 'UTILITY').trim().toUpperCase();
    const sampleValues = generateVariableExamples(bodyText);

    // 3. Perform official in-place Meta Cloud API update: POST https://graph.facebook.com/v19.0/{template_id}
    const editUrl = `https://graph.facebook.com/v19.0/${existing.template_id}`;
    const editPayload: any = {
      category: normalizedCategory,
      components: [
        {
          type: 'BODY',
          text: bodyText,
          ...(sampleValues.length > 0 ? { example: { body_text: [sampleValues] } } : {})
        }
      ]
    };

    const metaRes = await fetch(editUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editPayload)
    });

    const metaResult = await metaRes.json();

    if (metaResult.error) {
      console.error('[Meta Template Edit Error]:', metaResult.error);
      return NextResponse.json({
        error: metaResult.error.message || 'Unable to update template on Meta.',
        code: metaResult.error.code,
        subcode: metaResult.error.error_subcode
      }, { status: 400 });
    }

    // 4. Update local DB template record:
    // Status immediately transitions to PENDING, content and category updated, and previous rejection reason cleared
    const updatedMetadata = {
      ...(existing.metadata || {}),
      rejected_reason: null,
      rejection_reason_code: null,
      rejection_reason_message: null,
      last_meta_status_update: new Date().toISOString()
    };

    let updatedTemplate: any = null;
    let updateErr: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await db
          .from('templates')
          .update({
            status: 'PENDING',
            category: normalizedCategory,
            content: bodyText,
            language: language || existing.language || 'en_US',
            metadata: updatedMetadata
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          updatedTemplate = data;
          updateErr = null;
          break;
        }
        updateErr = error;
      } catch (e: any) {
        updateErr = e;
      }
      if (attempt < 3) await new Promise(r => setTimeout(r, 400));
    }

    if (updateErr || !updatedTemplate) {
      console.error('[DB Template Update Error]:', updateErr);
      // Even if local DB write lagged, return successful object with PENDING state
      return NextResponse.json({
        id: existing.id,
        tenant_id: tenantId,
        name: existing.name,
        template_id: existing.template_id,
        content: bodyText,
        status: 'PENDING',
        category: normalizedCategory,
        language: language || existing.language || 'en_US',
        metadata: updatedMetadata
      });
    }

    await invalidateTemplatesCache(tenantId);
    return NextResponse.json(updatedTemplate);

  } catch (err: unknown) {
    console.error('Meta Template Edit Handler Error:', err);
    const message = err instanceof Error ? err.message : 'Template edit failed';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}

