import { HelpArticle, AssistantSearchResult, ContextualSuggestion } from './types';
import { onboardingArticles } from './onboarding';
import { templateArticles } from './templates';
import { contactArticles } from './contacts';
import { campaignArticles } from './campaigns';
import { messagingArticles } from './messaging';
import { errorArticles } from './errors';
import { billingArticles } from './billing';
import { developerArticles } from './developer';

export const allArticles: HelpArticle[] = [
  ...onboardingArticles,
  ...templateArticles,
  ...contactArticles,
  ...campaignArticles,
  ...messagingArticles,
  ...errorArticles,
  ...billingArticles,
  ...developerArticles
];

const articleMap = new Map<string, HelpArticle>(
  allArticles.map((article) => [article.id, article])
);

export function getArticleById(id: string): HelpArticle | undefined {
  return articleMap.get(id);
}

export function getAllArticles(): HelpArticle[] {
  return allArticles;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'they',
  'can', 'could', 'should', 'would', 'how', 'why', 'what', 'when', 'where', 'who'
]);

export function searchHelpArticles(query: string, categoryFilter?: string): AssistantSearchResult[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const rawTokens = cleanQuery
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const queryTokens = rawTokens.filter((token) => !STOP_WORDS.has(token));
  const effectiveTokens = queryTokens.length > 0 ? queryTokens : rawTokens;

  // Numeric error code exact match check (e.g., "133010", "131049", "190")
  const numericMatch = cleanQuery.match(/\b\d{3,6}\b/);
  const targetErrorCode = numericMatch ? numericMatch[0] : null;

  const results: AssistantSearchResult[] = [];

  for (const article of allArticles) {
    if (categoryFilter && article.category !== categoryFilter) {
      continue;
    }

    let score = 0;
    const matchedKeywords: string[] = [];

    // 1. Error Code match: Instant Top Priority
    if (targetErrorCode && article.errorCode) {
      if (String(article.errorCode) === targetErrorCode) {
        score += 200;
        matchedKeywords.push(`Meta Error ${article.errorCode}`);
      }
    }

    // 2. Exact match on title or keywords
    const articleTitleLower = article.title.toLowerCase();
    if (articleTitleLower.includes(cleanQuery)) {
      score += 100;
    }

    for (const keyword of article.keywords) {
      const kwLower = keyword.toLowerCase();
      if (cleanQuery.includes(kwLower) || kwLower.includes(cleanQuery)) {
        score += 40;
        matchedKeywords.push(keyword);
      }
    }

    // 3. Token-based matching
    for (const token of effectiveTokens) {
      if (token.length < 2) continue;

      if (articleTitleLower.includes(token)) {
        score += 25;
      }
      for (const keyword of article.keywords) {
        if (keyword.toLowerCase().includes(token)) {
          score += 15;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
      if (article.summary.toLowerCase().includes(token)) {
        score += 8;
      }
      if (article.explanation.toLowerCase().includes(token)) {
        score += 5;
      }
      for (const step of article.steps) {
        if (step.toLowerCase().includes(token)) {
          score += 3;
        }
      }
    }

    if (score > 0) {
      results.push({
        article,
        score,
        matchedKeywords: Array.from(new Set(matchedKeywords))
      });
    }
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Contextual suggestion generator based on user's active page and workspace state.
 */
export function getContextualSuggestions(pathname: string, tenant: Record<string, unknown> | null | undefined): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  const waAccount = tenant?.whatsapp_account as Record<string, unknown> | undefined;
  const isConnected = waAccount?.status === 'ACTIVE' || waAccount?.status === 'CONNECTED';
  const isPending = waAccount?.status === 'PENDING' || waAccount?.status === 'UNVERIFIED' || waAccount?.status === 'LIMITED';

  // 1. Workspace Connection State Alerts (Top Priority if not fully connected)
  if (!waAccount || !isConnected) {
    if (isPending) {
      suggestions.push({
        id: 'meta_phone_pending',
        title: 'Meta Setup Pending Approval: How to finish registration',
        description: 'Complete Cloud API registration for your phone number.',
        articleId: 'meta_phone_pending',
        badge: 'Action Required',
        priority: 100
      });
    } else {
      suggestions.push({
        id: 'connect_whatsapp_meta',
        title: 'Connect your WhatsApp Business Account',
        description: 'Link your Meta Business profile to start sending.',
        articleId: 'connect_whatsapp_meta',
        badge: 'Setup Required',
        priority: 100
      });
    }
  }

  // 2. Page-Specific Suggestions
  if (pathname.includes('/templates')) {
    suggestions.push(
      {
        id: 'create_template',
        title: 'How do I create a WhatsApp template?',
        description: 'Syntax, categories, and submitting for approval.',
        articleId: 'create_template',
        badge: 'Templates'
      },
      {
        id: 'template_variables',
        title: 'What do {{1}} and {{2}} mean in templates?',
        description: 'Dynamic variables for customer personalization.',
        articleId: 'template_variables',
        badge: 'Syntax'
      },
      {
        id: 'template_rejected',
        title: 'Why was my template rejected by Meta?',
        description: 'Common policy violations and formatting fixes.',
        articleId: 'template_rejected',
        badge: 'Troubleshoot'
      },
      {
        id: 'template_pending',
        title: 'How long does template approval take?',
        description: 'Meta review times and status progression.',
        articleId: 'template_pending'
      }
    );
  } else if (pathname.includes('/contacts')) {
    suggestions.push(
      {
        id: 'import_contacts',
        title: 'How do I import contacts from Excel/CSV?',
        description: 'Bulk file upload and column formatting.',
        articleId: 'import_contacts',
        badge: 'Bulk Import'
      },
      {
        id: 'phone_number_format',
        title: 'What phone number format does WhatsApp require?',
        description: 'Country codes, E.164 standard, and validation.',
        articleId: 'phone_number_format',
        badge: 'Formatting'
      },
      {
        id: 'create_contact_group',
        title: 'How do I create and manage Contact Groups?',
        description: 'Segment customer lists for targeted campaigns.',
        articleId: 'create_contact_group'
      }
    );
  } else if (pathname.includes('/campaigns')) {
    suggestions.push(
      {
        id: 'create_campaign',
        title: 'How does campaign sending work?',
        description: 'Broadcast setup, scheduling, and recipient lists.',
        articleId: 'create_campaign',
        badge: 'Broadcasts'
      },
      {
        id: 'campaign_partially_delivered',
        title: 'Why was my campaign partially delivered?',
        description: 'Investigating undelivered and failed messages.',
        articleId: 'campaign_partially_delivered',
        badge: 'Troubleshoot'
      },
      {
        id: 'meta_tier_limits',
        title: 'How are daily template limits calculated?',
        description: 'Meta Tier 1K, 10K, and 100K sending limits.',
        articleId: 'meta_tier_limits'
      }
    );
  } else if (pathname.includes('/inbox')) {
    suggestions.push(
      {
        id: 'customer_service_window',
        title: 'What is the WhatsApp 24-hour service window?',
        description: 'Free-form messaging rules vs template requirements.',
        articleId: 'customer_service_window',
        badge: 'Messaging Window'
      },
      {
        id: 'send_single_message',
        title: 'How to chat 1-on-1 with customers in Inbox',
        description: 'Replying to inbound inquiries in real time.',
        articleId: 'send_single_message'
      },
      {
        id: 'message_delivery_statuses',
        title: 'Understanding message delivery ticks & statuses',
        description: 'Sent, Delivered, Read, and Error indicators.',
        articleId: 'message_delivery_statuses'
      }
    );
  } else if (pathname.includes('/groups')) {
    suggestions.push(
      {
        id: 'create_contact_group',
        title: 'How do I create a new Contact Group?',
        description: 'Group customers by tag, location, or tier.',
        articleId: 'create_contact_group',
        badge: 'Groups'
      },
      {
        id: 'import_contacts',
        title: 'How to import contacts straight into a group',
        description: 'Bulk CSV / Excel import workflows.',
        articleId: 'import_contacts'
      },
      {
        id: 'create_campaign',
        title: 'Send a broadcast campaign to a group',
        description: 'Select your group when launching campaigns.',
        articleId: 'create_campaign'
      }
    );
  } else if (pathname.includes('/pricing')) {
    suggestions.push(
      {
        id: 'free_trial_and_plans',
        title: 'How do Pingstack plans and early access offers work?',
        description: 'Starter (Free), Growth (₹199/mo), and Pro details.',
        articleId: 'free_trial_and_plans',
        badge: 'Plans'
      },
      {
        id: 'meta_conversation_charges',
        title: 'Meta conversation charges vs Pingstack subscription',
        description: 'Understand WhatsApp direct billing with 0% markup.',
        articleId: 'meta_conversation_charges'
      }
    );
  } else {
    // Default Dashboard suggestions
    if (isConnected) {
      suggestions.push(
        {
          id: 'what_to_do_after_connecting',
          title: 'What to do after connecting WhatsApp',
          description: '3 simple steps to launch your first broadcast.',
          articleId: 'what_to_do_after_connecting',
          badge: 'Next Steps'
        },
        {
          id: 'create_template',
          title: 'Create an approved message template',
          description: 'Required for proactive customer messaging.',
          articleId: 'create_template'
        },
        {
          id: 'import_contacts',
          title: 'Import your customer contacts from Excel',
          description: 'Fast CSV/Excel bulk upload.',
          articleId: 'import_contacts'
        },
        {
          id: 'create_campaign',
          title: 'Launch a broadcast campaign',
          description: 'Reach all your contacts simultaneously.',
          articleId: 'create_campaign'
        },
        {
          id: 'developer_api_keys',
          title: 'API Keys & REST Integration',
          description: 'Send messages programmatically from your backend.',
          articleId: 'developer_api_keys'
        }
      );
    } else {
      suggestions.push(
        {
          id: 'connect_whatsapp_meta',
          title: 'How to connect WhatsApp Business Account',
          description: 'Official Meta Cloud API Embedded Signup.',
          articleId: 'connect_whatsapp_meta',
          badge: 'Getting Started'
        },
        {
          id: 'free_trial_and_plans',
          title: 'Pingstack Starter Trial & Pricing',
          description: '15-day free access to explore all features.',
          articleId: 'free_trial_and_plans'
        }
      );
    }
  }

  return suggestions;
}
