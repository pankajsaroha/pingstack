import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API Google Import: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  try {
    const { access_token, groupId } = await req.json();

    let allContacts: any[] = [];
    let pageToken = '';

    do {
      const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Google API error');
      }

      const connections = data.connections || [];
      connections.forEach((person: any) => {
        const name = person.names?.[0]?.displayName || 'Google Contact';
        const phoneNumbers = person.phoneNumbers || [];
        
        phoneNumbers.forEach((p: any) => {
          let phone = p.value.replace(/[\s\-\(\)]/g, '');
          if (phone) {
            allContacts.push({
              tenant_id: tenantId,
              name: name,
              phone_number: phone
            });
          }
        });
      });

      pageToken = data.nextPageToken;
    } while (pageToken);

    if (allContacts.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Deduplication logic
    const { data: existingContacts } = await db
      .from('contacts')
      .select('id, phone_number')
      .eq('tenant_id', tenantId);

    const existingPhones = new Set(existingContacts?.map((c: any) => c.phone_number) || []);
    const newContacts = allContacts.filter((c: any) => !existingPhones.has(c.phone_number));
    const finalContacts = Array.from(new Map(newContacts.map((c: any) => [c.phone_number, c])).values());

    if (finalContacts.length > 0) {
      const { error: insertError } = await db.from('contacts').insert(finalContacts);
      if (insertError) throw insertError;
    }

    // Now handle Group Assignment for ALL imported contacts
    if (groupId) {
      const importedPhones = new Set(allContacts.map((c: any) => c.phone_number));
      const { data: allMatchedContacts } = await db
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('phone_number', Array.from(importedPhones));

      if (allMatchedContacts && allMatchedContacts.length > 0) {
        const groupContacts = allMatchedContacts.map((c: any) => ({
          tenant_id: tenantId,
          group_id: groupId,
          contact_id: c.id
        }));
        await db.from('group_contacts').upsert(groupContacts, { onConflict: 'group_id,contact_id' });
      }
    }

    return NextResponse.json({ success: true, count: allContacts.length });

  } catch (err: any) {
    console.error('Google Import Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to import contacts' }, { status: 500 });
  }
}
