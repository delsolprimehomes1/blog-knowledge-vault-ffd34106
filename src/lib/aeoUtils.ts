/**
 * Hans' AEO (Answer Engine Optimization) Rules for acceptedAnswer content
 * Client-side utility for schema generators
 * 
 * These rules ensure AI-quotable, Featured-Snippet-ready answers for:
 * - ChatGPT/Perplexity citations
 * - Google AI Overviews
 * - "People Also Ask" inclusion
 * - Voice assistant responses
 */

export const AEO_RULES = {
  MIN_WORDS: 80,
  IDEAL_MIN_WORDS: 80,
  IDEAL_MAX_WORDS: 120,
  MAX_WORDS: 150,
  MAX_CHARS: 800,
  MIN_LENGTH: 160,
};

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

/**
 * Truncates answer at sentence boundary for AI-safe schema output
 * Used in all FAQPage schema generators for acceptedAnswer.text
 * 
 * Hans' AEO Rules applied:
 * - Max 150 words
 * - Max 800 characters  
 * - Clean list formatting first
 * - Truncate at sentence boundary
 */
export function truncateForAEO(text: string, maxChars: number = 800): string {
  if (!text || typeof text !== 'string') return '';
  
  // Step 1: Clean list formatting first
  let cleanText = cleanListFormatting(text);
  
  // Step 2: Strip any remaining HTML tags
  cleanText = cleanText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Step 3: Check word count - enforce max 150 words
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length > AEO_RULES.MAX_WORDS) {
    cleanText = words.slice(0, AEO_RULES.MAX_WORDS).join(' ');
  }
  
  // Step 4: If within character limit, ensure proper ending
  if (cleanText.length <= maxChars) {
    if (!cleanText.endsWith('.') && !cleanText.endsWith('!') && !cleanText.endsWith('?')) {
      cleanText = cleanText.trim() + '.';
    }
    return cleanText;
  }
  
  // Step 5: Need to truncate - find sentence boundary
  const truncated = cleanText.substring(0, maxChars);
  
  // Find last sentence ending
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd >= AEO_RULES.MIN_LENGTH) {
    return cleanText.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Fallback: truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace >= AEO_RULES.MIN_LENGTH) {
    return cleanText.substring(0, lastSpace).trim() + '.';
  }
  
  // Final fallback
  return cleanText.substring(0, AEO_RULES.MIN_LENGTH).trim() + '...';
}

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
  if (wordCount < AEO_RULES.MIN_WORDS) {
    issues.push(`Too short: ${wordCount} words (min ${AEO_RULES.MIN_WORDS})`);
    score -= 30;
  }
  if (wordCount > AEO_RULES.MAX_WORDS) {
    issues.push(`Too long: ${wordCount} words (max ${AEO_RULES.MAX_WORDS})`);
    score -= 20;
  }
  
  // Character count check
  if (charCount > AEO_RULES.MAX_CHARS) {
    issues.push(`Too many characters: ${charCount} (max ${AEO_RULES.MAX_CHARS})`);
    score -= 15;
  }
  
  // Anti-pattern checks (list formatting)
  const antiPatterns = [
    /^\d+\.\s/m,           // Numbered lists at line start
    /^[-*•]\s/m,           // Bullet points at line start  
    /\n\s*\d+\.\s/,        // Numbered lists mid-text
    /\n\s*[-*•]\s/,        // Bullets mid-text
    /^##?\s/m,             // Markdown headings
    /<h[1-6]>/i,           // HTML headings
    /<ul>|<ol>|<li>/i,     // HTML lists
    /\n\n/,                // Double line breaks (multiple paragraphs)
  ];
  
  for (const pattern of antiPatterns) {
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
