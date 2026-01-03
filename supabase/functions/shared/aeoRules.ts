/**
 * Hans' AEO (Answer Engine Optimization) Rules for acceptedAnswer content
 * 
 * These rules ensure AI-quotable, Featured-Snippet-ready answers for:
 * - ChatGPT/Perplexity citations
 * - Google AI Overviews
 * - "People Also Ask" inclusion
 * - Voice assistant responses
 */

export const AEO_ANSWER_RULES = {
  // Word count limits
  MIN_WORDS: 80,
  IDEAL_MIN_WORDS: 80,
  IDEAL_MAX_WORDS: 120,
  MAX_WORDS: 150,
  MAX_CHARS: 800,
  
  // Prompt instructions for AI generation
  PROMPT_RULES: `
CRITICAL AEO FORMATTING RULES FOR speakable_answer:
- Word count: 80-120 words (absolute max 150 words)
- Character limit: max 800 characters
- Single paragraph ONLY - NO lists, bullets, or numbering
- NO headings, sections, or line breaks
- Complete sentences with clean ending (period)
- Write as VERDICT/CONCLUSION, not tutorial/explanation
- Self-contained (AI can quote verbatim without context)
- Neutral, factual tone (no "we", no marketing language)
- Must directly answer the question posed
- No "Here's what you need to know" or similar preambles
`,

  // Patterns that indicate bad formatting (reject if found)
  ANTI_PATTERNS: [
    /^\d+\.\s/m,           // Numbered lists at line start
    /^[-*•]\s/m,           // Bullet points at line start  
    /\n\s*\d+\.\s/,        // Numbered lists mid-text
    /\n\s*[-*•]\s/,        // Bullets mid-text
    /^##?\s/m,             // Markdown headings
    /<h[1-6]>/i,           // HTML headings
    /<ul>|<ol>|<li>/i,     // HTML lists
    /\n\n/,                // Double line breaks (multiple paragraphs)
    /^(First|Second|Third|Finally|Step \d)/im, // Sequential step language
  ] as RegExp[],

  // Model-specific prompts for different generation contexts
  SPEAKABLE_PROMPT_TEMPLATE: (languageName: string, question: string) => `
Write an 80-120 word speakable answer in ${languageName}.

Question: ${question}

HANS' AEO RULES:
- Write as a single paragraph VERDICT, not a tutorial
- NO lists, NO bullets, NO numbered points
- NO headings or line breaks
- Complete sentences ending with period
- 80-120 words (absolute max 150)
- Max 800 characters
- Self-contained (quotable without context)
- Neutral, factual tone
- Directly answer the question

WRONG: "There are several steps: 1. First... 2. Second..."
RIGHT: "Buying property in Costa del Sol involves obtaining a Spanish NIE, appointing an independent lawyer, opening a Spanish bank account, signing a private purchase agreement with deposit, and finalizing through a notary public deed."

Return ONLY the speakable answer text, no JSON, no formatting.
`,
};

/**
 * Validates an answer against Hans' AEO rules
 */
export function validateAEOAnswer(text: string): {
  valid: boolean;
  issues: string[];
  wordCount: number;
  charCount: number;
  score: number;
} {
  const issues: string[] = [];
  let score = 100;
  
  // Clean text for analysis
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = cleanText.length;
  
  // Word count checks
  if (wordCount < AEO_ANSWER_RULES.MIN_WORDS) {
    issues.push(`Too short: ${wordCount} words (min ${AEO_ANSWER_RULES.MIN_WORDS})`);
    score -= 30;
  }
  if (wordCount > AEO_ANSWER_RULES.MAX_WORDS) {
    issues.push(`Too long: ${wordCount} words (max ${AEO_ANSWER_RULES.MAX_WORDS})`);
    score -= 20;
  }
  
  // Character count check
  if (charCount > AEO_ANSWER_RULES.MAX_CHARS) {
    issues.push(`Too many characters: ${charCount} (max ${AEO_ANSWER_RULES.MAX_CHARS})`);
    score -= 15;
  }
  
  // Anti-pattern checks
  for (const pattern of AEO_ANSWER_RULES.ANTI_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Contains forbidden formatting: ${pattern.source.substring(0, 30)}...`);
      score -= 25;
      break; // Only count once
    }
  }
  
  // Sentence ending check
  const trimmed = cleanText.trim();
  if (!trimmed.endsWith('.') && !trimmed.endsWith('!') && !trimmed.endsWith('?')) {
    issues.push('Does not end with complete sentence punctuation');
    score -= 10;
  }
  
  return {
    valid: issues.length === 0,
    issues,
    wordCount,
    charCount,
    score: Math.max(0, score),
  };
}

/**
 * Truncates answer at sentence boundary for AI-safe schema output
 * Used in serve-seo-page and qaPageSchemaGenerator
 */
export function truncateForAEO(text: string, maxChars: number = 800): string {
  const MAX_WORDS = 150;
  const MIN_LENGTH = 160;
  
  // Strip HTML tags for clean processing
  let cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Check word count first
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length > MAX_WORDS) {
    // Truncate to MAX_WORDS words
    cleanText = words.slice(0, MAX_WORDS).join(' ');
  }
  
  // Now check character limit
  if (cleanText.length <= maxChars) {
    // Ensure proper ending
    if (!cleanText.endsWith('.') && !cleanText.endsWith('!') && !cleanText.endsWith('?')) {
      cleanText = cleanText.trim() + '.';
    }
    return cleanText;
  }
  
  // Need to truncate - find sentence boundary
  const truncated = cleanText.substring(0, maxChars);
  
  // Find last sentence ending
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd >= MIN_LENGTH) {
    return cleanText.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Fallback: truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace >= MIN_LENGTH) {
    return cleanText.substring(0, lastSpace).trim() + '.';
  }
  
  // Final fallback
  return cleanText.substring(0, MIN_LENGTH).trim() + '...';
}

/**
 * Cleans list formatting from AI-generated content
 * Converts numbered lists and bullets into flowing prose
 */
export function cleanListFormatting(text: string): string {
  let cleaned = text;
  
  // Remove numbered list patterns (1., 2., etc.)
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
  cleaned = cleaned.replace(/\n\s*\d+\.\s+/g, ' ');
  
  // Remove bullet patterns
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, '');
  cleaned = cleaned.replace(/\n\s*[-*•]\s+/g, ' ');
  
  // Remove markdown headings
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // Collapse multiple spaces and newlines
  cleaned = cleaned.replace(/\n+/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}
