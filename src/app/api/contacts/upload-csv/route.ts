import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import { enforceRateLimit } from '@/lib/rate-limit';
import { invalidateContactsCache } from '@/lib/server/contacts';
import { normalizePhoneNumber } from '@/lib/phone';
import { getContactQuota } from '@/lib/limits';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API CSV Upload: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const limitCheck = await enforceRateLimit(tenantId, 'file_upload');
    if (limitCheck.limited && limitCheck.response) {
      return limitCheck.response;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string | null;
    const confirmLimit = formData.get('confirmLimit') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    let records: any[] = [];

    if (filename.endsWith('.csv')) {
      const text = await file.text();
      records = parse(text, { columns: true, skip_empty_lines: true });
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      records = xlsx.utils.sheet_to_json(sheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload CSV or Excel.' }, { status: 400 });
    }

    const contactsToProcess = records.map((record: any) => {
      const keys = Object.keys(record);
      
      // Smart Phone Column Detection (phone, mobile, number, contact, whatsapp, tel)
      const phoneKey = keys.find(k => /phone|mobile|cell|contact|number|whatsapp|tel/i.test(k));
      const rawPhone = phoneKey ? record[phoneKey] : '';

      // Smart Name Column Detection (name, customer, client, user)
      const nameKey = keys.find(k => /name|customer|client|user/i.test(k));
      const rawName = nameKey ? record[nameKey] : '';

      return {
        tenant_id: tenantId,
        name: rawName ? String(rawName).trim() : null,
        phone_number: normalizePhoneNumber(rawPhone)
      };
    }).filter((c: any) => c.phone_number && c.phone_number.trim() !== '');

    if (contactsToProcess.length === 0) {
      return NextResponse.json({ error: 'No valid contacts found in file' }, { status: 400 });
    }

    // Step 1: Collect ALL unique phone numbers from this import
    const importedPhones = Array.from(new Set(contactsToProcess.map((c: any) => c.phone_number)));

    // Step 2: Fetch existing contacts to see which ones to skip for insertion
    const { data: existingContacts } = await db
      .from('contacts')
      .select('phone_number')
      .eq('tenant_id', tenantId)
      .in('phone_number', importedPhones);

    const existingPhonesSet = new Set(existingContacts?.map((c: any) => c.phone_number) || []);
    const newContacts = contactsToProcess.filter((c: any) => !existingPhonesSet.has(c.phone_number));

    // Unique check within the file for new contacts
    let finalNewContacts = Array.from(new Map(newContacts.map((c: any) => [c.phone_number, c])).values());

    // Step 3: Check Plan Contact Quota
    const quota = await getContactQuota(tenantId);
    if (finalNewContacts.length > quota.remainingQuota) {
      if (quota.remainingQuota <= 0) {
        return NextResponse.json({
          error: `You have reached your contact limit (${quota.maxContacts}) for your ${quota.planType.toUpperCase()} plan. Please upgrade to add more contacts.`
        }, { status: 403 });
      }

      if (!confirmLimit) {
        return NextResponse.json({
          limitWarning: true,
          importCount: finalNewContacts.length,
          remainingQuota: quota.remainingQuota,
          maxContacts: quota.maxContacts,
          currentCount: quota.currentCount,
          planType: quota.planType
        });
      }

      // Truncate to available quota if confirmed
      finalNewContacts = finalNewContacts.slice(0, quota.remainingQuota);
    }

    if (finalNewContacts.length > 0) {
      const { error: insertError } = await db.from('contacts').insert(finalNewContacts);
      if (insertError) throw insertError;
    }

    // Step 3: Handle Group Assignment for ALL imported contacts (new + existing)
    if (groupId) {
      const { data: allMatchedContacts } = await db
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('phone_number', importedPhones);

      if (allMatchedContacts && allMatchedContacts.length > 0) {
        const groupContacts = allMatchedContacts.map((c: any) => ({
          tenant_id: tenantId,
          group_id: groupId,
          contact_id: c.id
        }));
        await db.from('group_contacts').upsert(groupContacts, { onConflict: 'group_id,contact_id' });
      }
    }

    await invalidateContactsCache(tenantId);

    return NextResponse.json({ 
      success: true, 
      count: finalNewContacts.length,
      skipped: contactsToProcess.length - finalNewContacts.length
    });
  } catch (err: any) {
    console.error('CSV Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
