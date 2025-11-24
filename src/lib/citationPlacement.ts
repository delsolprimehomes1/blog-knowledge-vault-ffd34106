/**
 * Analyzes article content to suggest WHERE to place citations
 */

interface PlacementSuggestion {
  paragraphIndex: number;
  sentenceIndex: number;
  placementConfidence: number;
  matchedText: string;
  reasoning: string;
}

/**
 * Calculate text similarity using simple word overlap
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

/**
 * Parse HTML content into paragraphs and sentences
 */
function parseArticleContent(htmlContent: string): Array<{ paragraph: string; sentences: string[] }> {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const paragraphs: Array<{ paragraph: string; sentences: string[] }> = [];
  
  // Get all paragraph-like elements
  const elements = tempDiv.querySelectorAll('p, li, div');
  
  elements.forEach(el => {
    const text = el.textContent?.trim() || '';
    if (text.length < 20) return; // Skip very short paragraphs
    
    // Split into sentences (simple split on . ! ?)
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    
    if (sentences.length > 0) {
      paragraphs.push({
        paragraph: text,
        sentences
      });
    }
  });
  
  return paragraphs;
}

/**
 * Analyze where a citation should be placed in the article
 */
export function analyzeCitationPlacement(
  articleContent: string,
  citationContext: string
): PlacementSuggestion | null {
  if (!citationContext || citationContext.length < 10) {
    return null;
  }

  const paragraphs = parseArticleContent(articleContent);
  if (paragraphs.length === 0) {
    return null;
  }

  let bestMatch: PlacementSuggestion | null = null;
  let highestScore = 0;

  paragraphs.forEach((para, paraIndex) => {
    para.sentences.forEach((sentence, sentIndex) => {
      const similarity = calculateTextSimilarity(sentence, citationContext);
      
      if (similarity > highestScore && similarity > 20) { // Minimum 20% similarity
        highestScore = similarity;
        bestMatch = {
          paragraphIndex: paraIndex + 1, // 1-indexed for display
          sentenceIndex: sentIndex + 1,
          placementConfidence: Math.round(similarity),
          matchedText: sentence.substring(0, 100) + (sentence.length > 100 ? '...' : ''),
          reasoning: similarity > 60 
            ? 'Strong contextual match' 
            : similarity > 40 
            ? 'Moderate contextual match' 
            : 'Weak contextual match'
        };
      }
    });
  });

  return bestMatch;
}

/**
 * Get a human-readable placement description
 */
export function getPlacementDescription(suggestion: PlacementSuggestion | null): string {
  if (!suggestion) return 'No specific placement suggested';
  
  return `Paragraph ${suggestion.paragraphIndex}, Sentence ${suggestion.sentenceIndex}`;
}

/**
 * Get confidence color for placement
 */
export function getPlacementConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-emerald-600';
  if (confidence >= 50) return 'text-blue-600';
  if (confidence >= 30) return 'text-yellow-600';
  return 'text-gray-600';
}
