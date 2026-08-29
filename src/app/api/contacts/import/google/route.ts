import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API Google Import: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { access_token, groupId, confirmLimit, duplicateAction } = body;

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
          let phone = normalizePhoneNumber(p.value);
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

    // Fetch existing directory contacts to identify duplicates
    const { data: existingContacts } = await db
      .from('contacts')
      .select('id, name, phone_number')
      .eq('tenant_id', tenantId);

    const existingMap = new Map((existingContacts || []).map((c: any) => [c.phone_number, c]));
    
    // Unique list from Google
    const googleUniqueMap = new Map(allContacts.map((c: any) => [c.phone_number, c]));
    const googleContactsList = Array.from(googleUniqueMap.values());

    const newContactsList: any[] = [];
    const duplicateContactsList: any[] = [];

    googleContactsList.forEach((c: any) => {
      if (existingMap.has(c.phone_number)) {
        const existing = existingMap.get(c.phone_number);
        duplicateContactsList.push({
          phone_number: c.phone_number,
          newName: c.name,
          existingName: existing.name || 'Anonymous',
          existingId: existing.id
        });
      } else {
        newContactsList.push(c);
      }
    });

    // If duplicates exist and user hasn't explicitly chosen a duplicateAction
    if (duplicateContactsList.length > 0 && !duplicateAction && !confirmLimit) {
      return NextResponse.json({
        duplicateWarning: true,
        duplicates: duplicateContactsList,
        newCount: newContactsList.length,
        totalGoogleCount: googleContactsList.length,
        accessToken: access_token
      });
    }

    // Handle overwrite_all if requested
    if (duplicateAction === 'overwrite_all' && duplicateContactsList.length > 0) {
      for (const dup of duplicateContactsList) {
        if (dup.newName && dup.newName !== dup.existingName) {
          await db.from('contacts')
            .update({ name: dup.newName })
            .eq('id', dup.existingId)
            .eq('tenant_id', tenantId);
        }
      }
    }

    let contactsToInsert = newContactsList;
    if (contactsToInsert.length > 0) {
      const { getContactQuota } = require('@/lib/limits');
      const quota = await getContactQuota(tenantId);

      if (contactsToInsert.length > quota.remainingQuota) {
        if (quota.remainingQuota <= 0) {
          return NextResponse.json({
            error: `You have reached your contact limit (${quota.maxContacts}) for your ${quota.planType.toUpperCase()} plan. Please upgrade to add more contacts.`
          }, { status: 403 });
        }

        if (!confirmLimit) {
          return NextResponse.json({
            limitWarning: true,
            importCount: contactsToInsert.length,
            remainingQuota: quota.remainingQuota,
            maxContacts: quota.maxContacts,
            currentCount: quota.currentCount,
            planType: quota.planType,
            accessToken: access_token,
            isGoogle: true
          });
        }

        contactsToInsert = contactsToInsert.slice(0, quota.remainingQuota);
      }
      
      const { error: insertError } = await db.from('contacts').insert(contactsToInsert);
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

    const { invalidateContactsCache } = require('@/lib/server/contacts');
    await invalidateContactsCache(tenantId);

    return NextResponse.json({ 
      success: true, 
      count: contactsToInsert.length,
      skipped: allContacts.length - contactsToInsert.length
    });

  } catch (err: any) {
    console.error('Google Import Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to import contacts' }, { status: 500 });
  }
}
