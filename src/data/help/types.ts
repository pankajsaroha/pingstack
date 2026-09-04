export type HelpCategory = 
  | 'onboarding'
  | 'templates'
  | 'contacts'
  | 'campaigns'
  | 'messaging'
  | 'errors'
  | 'billing'
  | 'developer';

export interface HelpAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  keywords: string[];
  summary: string;
  explanation: string;
  whatHappened?: string;
  steps: string[];
  action?: HelpAction;
  relatedArticleIds?: string[];
  errorCode?: string | number;
  highlight?: boolean;
}

export interface ContextualSuggestion {
  id: string;
  title: string;
  description?: string;
  articleId: string;
  badge?: string;
  priority?: number;
}

export interface AssistantSearchResult {
  article: HelpArticle;
  score: number;
  matchedKeywords: string[];
}
