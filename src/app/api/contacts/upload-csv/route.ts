import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'undefined') {
    console.error('API CSV Upload: Missing or invalid x-tenant-id');
    return NextResponse.json({ error: 'Unauthorized: Missing tenant context' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const groupId = formData.get('groupId') as string | null;

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

    const contactsToProcess = records.map((record: any) => ({
      tenant_id: tenantId,
      name: record.name || record.Name || null,
      phone_number: String(record.phone || record.phone_number || record.Phone || record.PhoneNumber || '').replace(/\D/g, '')
    })).filter((c: any) => c.phone_number && c.phone_number.trim() !== '');

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
    const finalNewContacts = Array.from(new Map(newContacts.map((c: any) => [c.phone_number, c])).values());

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

    return NextResponse.json({ message: `Successfully processed ${importedPhones.length} contacts` });
  } catch (err: any) {
    console.error('CSV Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
