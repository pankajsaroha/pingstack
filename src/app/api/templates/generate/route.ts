import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActivePlanType } from '@/lib/plans';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  const apiKey = process.env.OpenAI_SECRET;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
  }

  try {
    // 1. Fetch Tenant to verify plan limits
    const { data: tenant, error: tError } = await db
      .from('tenants')
      .select('plan_type')
      .eq('id', tenantId)
      .single();

    if (tError || !tenant) {
      return NextResponse.json({ error: 'Tenant configuration check failed.' }, { status: 403 });
    }

    const activePlan = getActivePlanType(tenant.plan_type);
    if (activePlan === 'starter') {
      return NextResponse.json({ 
        error: 'Upgrade required. AI Template Generation is exclusively available on Growth and Pro plans.' 
      }, { status: 403 });
    }

    // 2. Get prompt from payload
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'A descriptive prompt is required.' }, { status: 400 });
    }

    // 3. Make direct HTTP request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert copywriter specialized in crafting WhatsApp templates for businesses.
Write a highly engaging, clear, and professional WhatsApp message body copy based on the user's description.

Rules:
1. Return ONLY the plain-text message body. Do not include subject lines, formatting, markdown, quotes, or conversational fluff.
2. Use parameter placeholders like {{1}}, {{2}}, {{3}} for variables (e.g. names, dates, order IDs, links).
3. Max length must be under 1024 characters.
4. Keep the tone friendly, modern, and aligned with standard business WhatsApp templates.`
          },
          {
            role: 'user',
            content: prompt.trim()
          }
        ],
        temperature: 0.7
      })
    });

    const completion = await response.json();

    if (completion.error) {
      console.error('[OpenAI API Error]:', completion.error);
      return NextResponse.json({ error: completion.error.message || 'OpenAI service error' }, { status: 500 });
    }

    const text = completion.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ text });

  } catch (err: any) {
    console.error('[AI Generate Template Error]:', err);
    return NextResponse.json({ error: err.message || 'Unexpected server processing failure.' }, { status: 500 });
  }
}
