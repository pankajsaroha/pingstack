import { HelpArticle } from './types';

export const contactArticles: HelpArticle[] = [
  {
    id: 'import_contacts',
    title: 'How do I import contacts from Excel or CSV?',
    category: 'contacts',
    keywords: [
      'import contacts',
      'excel import',
      'csv import',
      'upload contacts',
      'bulk import',
      'spreadsheet',
      'phone numbers'
    ],
    summary: 'Upload thousands of customer contacts in seconds using an Excel (.xlsx/.xls) or CSV file.',
    explanation: 'Pingstack supports bulk imports with automatic phone number normalization and custom column mapping.',
    whatHappened: 'You want to add customer contact numbers in bulk for campaigns and segmenting.',
    steps: [
      'Navigate to the "Contacts" page in the sidebar.',
      'Click the "Import Contacts" or "Upload File" button.',
      'Choose your .csv or .xlsx file containing names and phone numbers.',
      'Ensure phone numbers include the country code (e.g. +91 98765 43210 or 919876543210 for India, 1 for US).',
      'Review the parsed contacts and click "Confirm Import".'
    ],
    action: {
      label: 'Go to Contacts',
      href: '/contacts'
    },
    relatedArticleIds: ['phone_number_format', 'create_contact_group', 'create_campaign']
  },
  {
    id: 'phone_number_format',
    title: 'What phone number format does WhatsApp require?',
    category: 'contacts',
    keywords: [
      'phone number format',
      'country code',
      'e164',
      'invalid number',
      'international format',
      'plus sign',
      'prefix'
    ],
    summary: 'WhatsApp requires international E.164 phone number formatting including the country code.',
    explanation: 'Messages cannot be delivered to local numbers that lack a valid country code prefix.',
    whatHappened: 'Phone numbers without country codes will fail validation when sending messages.',
    steps: [
      'Always include the country code without leading zeroes (e.g., for India use 91XXXXXXXXXX or +91XXXXXXXXXX).',
      'For US/Canada, use 1XXXXXXXXXX or +1XXXXXXXXXX.',
      'Pingstack automatically strips spaces, dashes, and parentheses, but the numeric country prefix is mandatory.',
      'Double check recipient numbers in Contacts if you notice delivery failures.'
    ],
    action: {
      label: 'View Contacts',
      href: '/contacts'
    },
    relatedArticleIds: ['import_contacts', 'error_131026']
  },
  {
    id: 'create_contact_group',
    title: 'How do I create and manage Contact Groups?',
    category: 'contacts',
    keywords: [
      'create group',
      'contact groups',
      'segments',
      'customer list',
      'group management',
      'broadcast list'
    ],
    summary: 'Organize your customer base into targeted groups for segmented broadcasts and marketing campaigns.',
    explanation: 'Groups let you group customers by criteria like VIPs, Recent Buyers, Leads, or Location.',
    whatHappened: 'You want to target specific audiences rather than sending to your entire contact list.',
    steps: [
      'Go to the "Groups" page in the sidebar.',
      'Click "+ New Group" and enter a name (e.g., "Active Subscribers" or "Diwali Sale VIPs").',
      'Add existing contacts or import a fresh list directly into this specific group.',
      'When launching a Campaign, choose the Group name as the broadcast destination.'
    ],
    action: {
      label: 'Open Groups',
      href: '/groups'
    },
    relatedArticleIds: ['import_contacts', 'create_campaign']
  }
];
