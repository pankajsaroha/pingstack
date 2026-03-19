import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Gupshup webhook payload usually contains type and payload
    if (payload && payload.type === 'message-event') {
      const event = payload.payload;
      const providerMsgId = event.id;
      const eventType = event.type; // delivered, read, failed

      if (providerMsgId) {
        let status = 'sent';
        if (eventType === 'delivered') status = 'delivered';
        if (eventType === 'failed') status = 'failed';
        if (eventType === 'read') status = 'read';

        await db.from('messages')
          .update({ status })
          .eq('provider_message_id', providerMsgId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
