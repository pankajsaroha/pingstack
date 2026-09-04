import { HelpArticle } from './types';

export const templateArticles: HelpArticle[] = [
  {
    id: 'create_template',
    title: 'How do I create a WhatsApp message template?',
    category: 'templates',
    keywords: [
      'create template',
      'new template',
      'template syntax',
      'add template',
      'whatsapp template',
      'submit template'
    ],
    summary: 'Create and submit standard message templates to Meta for automated or broadcast messaging.',
    explanation: 'WhatsApp requires business-initiated messages (campaigns and notifications) to use pre-approved templates.',
    whatHappened: 'To send proactive broadcasts to customers outside the 24-hour window, you need an approved template.',
    steps: [
      'Navigate to the "Templates" page from the sidebar.',
      'Click the "+ New Template" button in the top-right corner.',
      'Choose a clear template name (lowercase letters and underscores only, e.g., "order_update_v1").',
      'Select a category: Marketing, Utility, or Authentication.',
      'Write your message body and add variables such as {{1}}, {{2}} for dynamic personalization.',
      'Add optional media headers (Image, Video, Document) or interactive quick reply / CTA buttons.',
      'Click "Submit to Meta" for automated approval.'
    ],
    action: {
      label: 'Go to Templates',
      href: '/templates'
    },
    relatedArticleIds: ['template_variables', 'template_pending', 'template_rejected']
  },
  {
    id: 'template_variables',
    title: 'What do {{1}} and {{2}} mean in templates?',
    category: 'templates',
    keywords: [
      'template variables',
      'variables',
      'brackets',
      '{{1}}',
      '{{2}}',
      'personalization',
      'dynamic fields',
      'contact name'
    ],
    summary: 'Variables represent dynamic placeholder values replaced with contact data when sending messages.',
    explanation: 'Double curly braces like {{1}}, {{2}}, and {{3}} let you personalize messages for each recipient during a broadcast.',
    whatHappened: 'Variables allow you to insert the customer\'s name, order ID, tracking link, or custom promo code dynamically.',
    steps: [
      'In your template editor, insert {{1}} for the recipient\'s name (or primary variable).',
      'Insert {{2}}, {{3}}, etc., for additional details like invoice numbers, dates, or discounts.',
      'When launching a campaign, Pingstack automatically maps {{1}} to the contact\'s name or Excel column values.',
      'Meta requires variable samples (e.g., sample name "Alex") during submission to verify message clarity.'
    ],
    action: {
      label: 'Manage Templates',
      href: '/templates'
    },
    relatedArticleIds: ['create_template', 'import_contacts', 'create_campaign']
  },
  {
    id: 'template_pending',
    title: 'Why is my template pending approval?',
    category: 'templates',
    keywords: [
      'template pending',
      'pending review',
      'approval time',
      'how long approval',
      'meta review',
      'in review'
    ],
    summary: 'Meta\'s automated and manual review systems check every template against WhatsApp Business policies.',
    explanation: 'Most templates are approved within 1 to 5 minutes by Meta\'s AI systems, though some reviews can take up to 24 hours.',
    whatHappened: 'Your template was successfully submitted to Meta and is currently in the review queue.',
    steps: [
      'Wait for the review to complete. In most cases, status updates to APPROVED in under 10 minutes.',
      'You do not need to resubmit the template while it is in the PENDING state.',
      'Once approved, the status turns green and the template becomes immediately available for campaigns and automation.'
    ],
    action: {
      label: 'Check Templates Status',
      href: '/templates'
    },
    relatedArticleIds: ['template_rejected', 'create_template']
  },
  {
    id: 'template_rejected',
    title: 'Why was my template rejected by Meta & how to fix it?',
    category: 'templates',
    keywords: [
      'template rejected',
      'rejected',
      'meta rejection',
      'policy violation',
      'fix template',
      'category mismatch'
    ],
    summary: 'Understand common Meta rejection reasons and how to format templates for instant approval.',
    explanation: 'Meta rejects templates that contain spelling errors, vague variables, prohibited content, or category mismatches.',
    whatHappened: 'Meta rejected the template due to policy constraints or formatting inconsistencies.',
    steps: [
      'Category Mismatch: Ensure you did not select "Utility" for promotional/discount messages. Use "Marketing" instead.',
      'Variable placement: Do not place variables at the very beginning or very end of a sentence without surrounding context.',
      'Spelling & Grammar: Double-check for typos and avoid excessive capitalization or repetitive punctuation (e.g. "BUY NOW!!!!").',
      'Sample Content: Ensure all variable placeholders have realistic sample values provided.',
      'Create a new template with the corrected text and submit again.'
    ],
    action: {
      label: 'Create New Template',
      href: '/templates'
    },
    relatedArticleIds: ['create_template', 'template_variables']
  }
];
