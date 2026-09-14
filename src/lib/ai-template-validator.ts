/**
 * AI WhatsApp Template Output Validation Module
 * Enforces strict structure, sequential variable indexing, category constraints,
 * length bounds, and safety checks on model outputs.
 */

export interface AiTemplateVariable {
  position: number;
  meaning: string;
}

export interface AiTemplateSuggestion {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  body: string;
  variables: AiTemplateVariable[];
}

export interface AiTemplateValidationResult {
  valid: boolean;
  suggestions?: AiTemplateSuggestion[];
  error?: string;
}

const VALID_CATEGORIES = new Set(['UTILITY', 'MARKETING', 'AUTHENTICATION']);
const MAX_BODY_LENGTH = 1024;
const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 3;

/**
 * Validates and sanitizes the parsed OpenAI model completion.
 */
export function validateAiTemplateOutput(rawOutput: any, fallbackLanguage: string = 'en_US'): AiTemplateValidationResult {
  if (!rawOutput || typeof rawOutput !== 'object') {
    return { valid: false, error: 'Malformed AI response. Expected JSON object.' };
  }

  const rawList = rawOutput.suggestions;
  if (!Array.isArray(rawList) || rawList.length < MIN_SUGGESTIONS) {
    return { 
      valid: false, 
      error: `Model returned ${Array.isArray(rawList) ? rawList.length : 0} suggestions. At least ${MIN_SUGGESTIONS} suggestions are required.` 
    };
  }

  const cleanSuggestions: AiTemplateSuggestion[] = [];

  for (let i = 0; i < Math.min(rawList.length, MAX_SUGGESTIONS); i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Suggestion #${i + 1} is invalid.` };
    }

    // 1. Sanitize & validate Name
    let rawName = String(item.name || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!rawName) {
      rawName = `template_suggestion_${i + 1}`;
    }
    if (rawName.length > 512) {
      rawName = rawName.substring(0, 512);
    }

    // 2. Validate Category
    let category = String(item.category || 'UTILITY').toUpperCase();
    if (!VALID_CATEGORIES.has(category)) {
      category = 'UTILITY';
    }

    // 3. Validate Language
    let language = String(item.language || fallbackLanguage).trim();
    if (!language || language.length > 10) {
      language = fallbackLanguage;
    }

    // 4. Validate Body
    const body = String(item.body || '').trim();
    if (!body) {
      return { valid: false, error: `Suggestion #${i + 1} has an empty message body.` };
    }
    if (body.length > MAX_BODY_LENGTH) {
      return { 
        valid: false, 
        error: `Suggestion #${i + 1} body length (${body.length} chars) exceeds Meta limit of ${MAX_BODY_LENGTH} characters.` 
      };
    }

    // Security Check: No HTML tags
    if (/<[a-z][\s\S]*>/i.test(body)) {
      return { valid: false, error: `Suggestion #${i + 1} contains prohibited HTML markup.` };
    }

    // Prompt Leakage Check
    if (/system prompt|openai|chatgpt|as an ai/i.test(body)) {
      return { valid: false, error: `Suggestion #${i + 1} contains system prompt leakage.` };
    }

    // 5. Variable Placeholder & Sequential Indexing Validation
    const variableMatches = Array.from(body.matchAll(/\{\{(\d+)\}\}/g));
    const detectedPositions = variableMatches.map(m => parseInt(m[1], 10));

    // Check for invalid single braces {1} or name syntax {{name}}
    const invalidBraceMatch = body.match(/(?<!\{)\{([0-9a-zA-Z_]+)\}(?!\})/g);
    if (invalidBraceMatch) {
      return { valid: false, error: `Suggestion #${i + 1} uses invalid single brace syntax: ${invalidBraceMatch.join(', ')}` };
    }
    const nonNumericVariableMatch = body.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
    if (nonNumericVariableMatch) {
      return { valid: false, error: `Suggestion #${i + 1} uses non-numeric variable syntax: ${nonNumericVariableMatch.join(', ')}. WhatsApp requires numeric placeholders e.g. {{1}}, {{2}}.` };
    }

    // Verify sequential ordering starting at 1
    const uniquePositions = Array.from(new Set(detectedPositions)).sort((a, b) => a - b);
    for (let posIdx = 0; posIdx < uniquePositions.length; posIdx++) {
      const expectedPos = posIdx + 1;
      if (uniquePositions[posIdx] !== expectedPos) {
        return { 
          valid: false, 
          error: `Suggestion #${i + 1} has non-sequential variable placeholders. Found {{${uniquePositions[posIdx]}}}, expected {{${expectedPos}}}.` 
        };
      }
    }

    // Normalize and validate variables array
    const rawVariables = Array.isArray(item.variables) ? item.variables : [];
    const cleanVariables: AiTemplateVariable[] = uniquePositions.map(pos => {
      const found = rawVariables.find((v: any) => v && (v.position === pos || Number(v.position) === pos));
      const meaning = (found && found.meaning && typeof found.meaning === 'string') 
        ? found.meaning.trim() 
        : `Variable ${pos}`;
      return {
        position: pos,
        meaning
      };
    });

    cleanSuggestions.push({
      name: rawName,
      category: category as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
      language,
      body,
      variables: cleanVariables
    });
  }

  return {
    valid: true,
    suggestions: cleanSuggestions
  };
}
