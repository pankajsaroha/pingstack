import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const contactsToInsert = records.map((record: any) => ({
      tenant_id: tenantId,
      name: record.name || record.Name || null,
      phone_number: String(record.phone || record.phone_number || record.Phone || record.PhoneNumber || '')
    })).filter((c: any) => c.phone_number && c.phone_number.trim() !== '');

    if (contactsToInsert.length === 0) {
      return NextResponse.json({ error: 'No valid contacts found in file' }, { status: 400 });
    }

    const { data: contacts, error } = await db.from('contacts')
      .upsert(contactsToInsert, { onConflict: 'tenant_id,phone_number' })
      .select('id');

    if (error) throw error;

    if (groupId && contacts) {
      const groupContacts = contacts.map(c => ({
        tenant_id: tenantId,
        group_id: groupId,
        contact_id: c.id
      }));
      await db.from('group_contacts').upsert(groupContacts, { onConflict: 'group_id,contact_id' });
    }

    return NextResponse.json({ message: `Successfully uploaded ${contacts?.length || 0} contacts` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
