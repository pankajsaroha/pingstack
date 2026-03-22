import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const campaignId = params.id;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      phone_number,
      status,
      updated_at,
      contacts (
        name
      )
    `)
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
