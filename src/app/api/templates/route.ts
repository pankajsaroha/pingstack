import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    console.error('API GET templates: Missing x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error('API GET templates: Supabase DB not initialized');
    return NextResponse.json({ error: 'Server error: database not initialized' }, { status: 500 });
  }

  const { data, error } = await db.from('templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('API GET templates error', { tenantId, error });
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { name, template_id, content } = await req.json();
    if (!name || !template_id || !content) {
      return NextResponse.json({ error: 'Missing required fields (name, template_id, content)' }, { status: 400 });
    }

    const { data, error } = await db.from('templates')
      .insert({ 
        tenant_id: tenantId, 
        name, 
        template_id, 
        content, 
        status: 'active' 
      })
      .select().single();

    if (error) {
      console.error('Add template error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Template processing error:', err);
    return NextResponse.json({ error: 'Invalid request body or processing error' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    // 1. Fetch template names and details before deleting them
    const { data: templatesToDelete, error: fetchError } = await db
      .from('templates')
      .select('name')
      .in('id', ids)
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('Failed to query templates for deletion:', fetchError);
    }

    // 2. Fetch Meta credentials and WABA ID to delete templates from Meta
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('access_token, business_id')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (whatsappAccount?.access_token && whatsappAccount?.business_id) {
      const { decrypt } = await import('@/lib/encryption');
      const accessToken = decrypt(whatsappAccount.access_token);
      const wabaId = whatsappAccount.business_id;

      for (const t of templatesToDelete || []) {
        if (t.name) {
          // DELETE https://graph.facebook.com/v19.0/{waba-id}/message_templates?name={name}
          const metaUrl = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?name=${encodeURIComponent(t.name)}`;
          try {
            const metaRes = await fetch(metaUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            const metaResult = await metaRes.json();
            if (metaResult.error) {
              console.error(`Failed to delete template '${t.name}' on Meta:`, metaResult.error);
            } else {
              console.log(`Successfully deleted template '${t.name}' on Meta:`, metaResult);
            }
          } catch (metaErr) {
            console.error(`Network error deleting template '${t.name}' on Meta:`, metaErr);
          }
        }
      }
    }

    // 3. Delete records locally
    const { error: deleteError } = await db
      .from('templates')
      .delete()
      .in('id', ids)
      .eq('tenant_id', tenantId);

    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Template deletion route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
