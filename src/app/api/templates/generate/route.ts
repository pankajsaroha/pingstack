import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAiTemplateQuota, checkAiTemplateRateLimit, consumeAiTemplateQuota, isFeatureAllowed } from '@/lib/limits';
import { validateAiTemplateOutput } from '@/lib/ai-template-validator';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OpenAI_SECRET || process.env.OPENAI_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured on server.' }, { status: 500 });
  }

  try {
    // 1. Plan Entitlement Verification
    const isAllowed = await isFeatureAllowed(tenantId, 'ai_templates');
    if (!isAllowed) {
      return NextResponse.json({
        error: 'Upgrade required. AI Template Generation is exclusively available on Growth and Pro plans.',
        code: 'FEATURE_GATED'
      }, { status: 403 });
    }

    // 2. Short-term Rate Limit Check (Max 3 requests per 10 minutes)
    const rateLimit = await checkAiTemplateRateLimit(tenantId);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: `Rate limit reached. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before requesting more AI suggestions.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: rateLimit.retryAfterSeconds
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds || 60)
        }
      });
    }

    // 3. Monthly Quota Check (5 for Growth, 20 for Pro)
    const quota = await getAiTemplateQuota(tenantId);
    if (quota.remainingQuota <= 0) {
      return NextResponse.json({
        error: `Monthly AI template generation limit reached (${quota.usedRequests}/${quota.maxRequests} used). Upgrade to Pro for 20 suggestions/month.`,
        code: 'QUOTA_EXHAUSTED',
        quota
      }, { status: 403 });
    }

    // 4. Input Payload Validation
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ error: 'A descriptive use case prompt is required.' }, { status: 400 });
    }
    if (prompt.length > 1000) {
      return NextResponse.json({ error: 'Prompt exceeds maximum allowed length of 1000 characters.' }, { status: 400 });
    }

    const preferredCategory = typeof body?.category === 'string' ? body.category.toUpperCase() : 'UTILITY';
    const preferredLanguage = typeof body?.language === 'string' ? body.language : 'en_US';

    // 5. OpenAI Structured Output Request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a WhatsApp Business template specialist.
Based on the user's use case, generate exactly 2 to 3 distinct, high-quality, professional WhatsApp message template suggestions.

Return ONLY a strictly valid JSON object matching this schema:
{
  "suggestions": [
    {
      "name": "snake_case_template_name",
      "category": "${preferredCategory}",
      "language": "${preferredLanguage}",
      "body": "Message body text with sequential parameter placeholders {{1}}, {{2}}, etc.",
      "variables": [
        { "position": 1, "meaning": "Customer Name" }
      ]
    }
  ]
}

Rules:
1. Variables in the message body MUST be numbered sequentially starting from 1: {{1}}, {{2}}, {{3}} with NO gaps or missing indices.
2. Introduce variables ONLY when genuinely necessary for dynamic customer/order/date values.
3. Every suggestion must be materially different (e.g. standard concise, detailed, action-oriented).
4. Total body length for each suggestion must be under 1024 characters.
5. Do NOT include HTML, markdown formatting headers, or conversational filler.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[OpenAI API Error Status]:', response.status, errText);
      return NextResponse.json({ 
        error: response.status === 429 ? 'OpenAI capacity limit exceeded. Please try again shortly.' : 'OpenAI service temporarily unavailable.',
        code: 'OPENAI_ERROR'
      }, { status: 502 });
    }

    const completion = await response.json();
    if (completion.error) {
      console.error('[OpenAI API Error Body]:', completion.error);
      return NextResponse.json({ error: completion.error.message || 'OpenAI service error' }, { status: 500 });
    }

    const rawContent = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!rawContent) {
      return NextResponse.json({ error: 'Empty completion received from AI model.' }, { status: 500 });
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[AI Parse Error]:', parseErr, rawContent);
      return NextResponse.json({ error: 'Malformed JSON returned by AI model.' }, { status: 422 });
    }

    // 6. Strict Validation of Model Output
    const validation = validateAiTemplateOutput(parsedJson, preferredLanguage);
    if (!validation.valid || !validation.suggestions || validation.suggestions.length === 0) {
      console.warn('[AI Template Validation Failed]:', validation.error);
      return NextResponse.json({
        error: validation.error || 'Generated template failed validation safety checks.',
        code: 'VALIDATION_FAILED'
      }, { status: 422 });
    }

    // 7. Atomically Consume Monthly Quota (Only on Successful Generation & Validation)
    const usage = await consumeAiTemplateQuota(tenantId);

    // 8. Audit Trail Logging
    await logAuditEvent({
      tenantId,
      userId,
      action: 'TEMPLATE_CREATE',
      resource: 'ai:templates:generate',
      details: {
        promptLength: prompt.length,
        suggestionsCount: validation.suggestions.length,
        usedQuota: usage.used,
        maxQuota: usage.max
      }
    });

    return NextResponse.json({
      success: true,
      suggestions: validation.suggestions,
      quota: usage
    });

  } catch (err: any) {
    console.error('[AI Generate Template Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Unexpected server processing failure.' }, { status: 500 });
  }
}
