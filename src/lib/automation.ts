import { db } from './db';
import { messageQueue } from './queue';
import { renderTemplateBody } from './templates';
import { checkTemplateSendLimit, incrementTemplateSendUsage, isFeatureAllowed } from './limits';

export type TriggerType = 'keyword' | 'welcome' | 'message_contains' | 'exact_match';

export interface AutomationCondition {
  field: 'text' | 'sender_name' | 'sender_phone' | 'time_of_day' | 'is_first_message';
  operator: 'equals' | 'contains' | 'starts_with' | 'not_contains' | 'outside_hours';
  value?: string;
}

export interface AutomationAction {
  type: 'send_template' | 'send_text';
  templateName?: string;
  language?: string;
  variables?: string[] | Record<string, string>;
  text?: string;
  delaySeconds?: number;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: {
    keywords?: string[];
    match_type?: 'exact' | 'contains';
  };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string | null;
  created_at?: string;
}

/**
 * Safely evaluates and executes matching automation rules for an incoming message.
 */
export async function evaluateAndExecuteAutomations({
  tenantId,
  contactId,
  fromPhone,
  messageText,
  contactName,
  isFirstMessage = false,
}: {
  tenantId: string;
  contactId: string;
  fromPhone: string;
  messageText: string;
  contactName?: string;
  isFirstMessage?: boolean;
}): Promise<void> {
  if (!db || !tenantId || !fromPhone) return;

  try {
    // 1. Verify tenant plan allows automation
    const allowed = await isFeatureAllowed(tenantId, 'automation');
    if (!allowed) return;

    // 2. Fetch active rules for this tenant
    const { data: rules, error } = await db
      .from('automation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !rules || rules.length === 0) return;

    const normalizedText = (messageText || '').trim().toLowerCase();
    const cleanPhone = fromPhone.replace(/\D/g, '');

    for (const rule of rules as AutomationRule[]) {
      const isMatched = matchTriggerAndConditions(rule, {
        normalizedText,
        cleanPhone,
        contactName: contactName || 'Customer',
        isFirstMessage,
      });

      if (isMatched) {
        console.log(`[Automation] Rule "${rule.name}" (${rule.id}) triggered for phone ${fromPhone}`);
        await executeRuleActions(rule, {
          tenantId,
          contactId,
          fromPhone: cleanPhone,
          contactName: contactName || 'Customer',
          messageText,
        });

        // Update rule execution count
        await db
          .from('automation_rules')
          .update({
            execution_count: (rule.execution_count || 0) + 1,
            last_executed_at: new Date().toISOString(),
          })
          .eq('id', rule.id);
      }
    }
  } catch (err: any) {
    console.error('[Automation Engine Error]:', err.message || err);
  }
}

/**
 * Evaluates whether an incoming message matches the rule's trigger and conditions.
 */
function matchTriggerAndConditions(
  rule: AutomationRule,
  context: {
    normalizedText: string;
    cleanPhone: string;
    contactName: string;
    isFirstMessage: boolean;
  }
): boolean {
  const { normalizedText, isFirstMessage } = context;
  const triggerType = rule.trigger_type;
  const triggerConfig = rule.trigger_config || {};
  const keywords = (triggerConfig.keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);

  // 1. Evaluate Trigger
  let triggerMatched = false;

  if (triggerType === 'welcome') {
    triggerMatched = isFirstMessage;
  } else if (triggerType === 'exact_match') {
    triggerMatched = keywords.some((k) => normalizedText === k);
  } else if (triggerType === 'message_contains' || triggerType === 'keyword') {
    if (keywords.length === 0) {
      triggerMatched = true; // Match all incoming if no keywords set
    } else {
      triggerMatched = keywords.some((k) => normalizedText.includes(k));
    }
  }

  if (!triggerMatched) return false;

  // 2. Evaluate Advanced Conditions (Pro)
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  if (conditions.length === 0) return true;

  return conditions.every((cond) => {
    const val = (cond.value || '').trim().toLowerCase();
    switch (cond.field) {
      case 'text':
        if (cond.operator === 'equals') return normalizedText === val;
        if (cond.operator === 'contains') return normalizedText.includes(val);
        if (cond.operator === 'starts_with') return normalizedText.startsWith(val);
        if (cond.operator === 'not_contains') return !normalizedText.includes(val);
        return true;
      case 'sender_name':
        const sName = (context.contactName || '').toLowerCase();
        if (cond.operator === 'contains') return sName.includes(val);
        if (cond.operator === 'equals') return sName === val;
        return true;
      case 'is_first_message':
        return isFirstMessage;
      default:
        return true;
    }
  });
}

/**
 * Executes the configured actions for a matched automation rule.
 */
async function executeRuleActions(
  rule: AutomationRule,
  context: {
    tenantId: string;
    contactId: string;
    fromPhone: string;
    contactName: string;
    messageText: string;
  }
): Promise<void> {
  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  if (actions.length === 0) return;

  for (const action of actions) {
    if (action.type === 'send_template' && action.templateName) {
      // 1. Check daily send quota
      const canSend = await checkTemplateSendLimit(context.tenantId, 1);
      if (!canSend) {
        console.warn(`[Automation] Skipped template reply "${action.templateName}" - Daily quota reached for tenant ${context.tenantId}`);
        continue;
      }

      // 2. Fetch template content
      const { data: template } = await db!
        .from('templates')
        .select('content, language')
        .eq('name', action.templateName)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      const rawContent = template?.content || `[Template: ${action.templateName}]`;
      const resolvedContent = renderTemplateBody(rawContent, action.variables, {
        name: context.contactName,
        phone: context.fromPhone,
      });

      // 3. Create outbound message in DB
      const { data: msg, error: mErr } = await db!.from('messages').insert({
        tenant_id: context.tenantId,
        contact_id: context.contactId,
        phone_number: context.fromPhone,
        direction: 'outbound',
        content: resolvedContent,
        message_type: 'template',
        status: 'pending',
      }).select('id').single();

      if (mErr || !msg) {
        console.error('[Automation] Failed to record auto-reply message:', mErr);
        continue;
      }

      // 4. Queue job in BullMQ
      const paramsList = Array.isArray(action.variables)
        ? action.variables
        : action.variables && typeof action.variables === 'object'
        ? Object.values(action.variables)
        : [];

      const metaParams = paramsList.map((v) => ({ type: 'text', text: String(v) }));
      const components = metaParams.length > 0 ? [{ type: 'body', parameters: metaParams }] : [];

      await messageQueue.add('send-whatsapp', {
        messageId: msg.id,
        phone: context.fromPhone,
        templateId: action.templateName,
        templateLanguage: action.language || template?.language || 'en_US',
        isDirectText: false,
        components,
        params: metaParams,
      });

      await incrementTemplateSendUsage(context.tenantId, 1);
      console.log(`[Automation] Queued template auto-reply "${action.templateName}" to ${context.fromPhone}`);
    } else if (action.type === 'send_text' && action.text) {
      // Direct session reply (if customer 24h window is open)
      const textBody = action.text
        .replace(/\{\{name\}\}/gi, context.contactName)
        .replace(/\{\{phone\}\}/gi, context.fromPhone);

      const { data: msg, error: mErr } = await db!.from('messages').insert({
        tenant_id: context.tenantId,
        contact_id: context.contactId,
        phone_number: context.fromPhone,
        direction: 'outbound',
        content: textBody,
        message_type: 'text',
        status: 'pending',
      }).select('id').single();

      if (mErr || !msg) continue;

      await messageQueue.add('send-whatsapp', {
        messageId: msg.id,
        phone: context.fromPhone,
        isDirectText: true,
        textContent: textBody,
      });

      console.log(`[Automation] Queued text auto-reply to ${context.fromPhone}`);
    }
  }
}
