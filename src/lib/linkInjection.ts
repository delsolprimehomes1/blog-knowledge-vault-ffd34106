import { ExternalCitation } from "@/types/blog";

/**
 * Safely get citation source name, handling different field names
 */
const getCitationSource = (citation: ExternalCitation): string => {
  return citation.source || citation.sourceName || '';
};

/**
 * Safely get citation text, handling different field names
 */
const getCitationText = (citation: ExternalCitation): string => {
  return citation.text || citation.anchorText || '';
};

/**
 * Injects external links into article content based on entity matching
 */
export const injectExternalLinks = (
  content: string,
  citations: ExternalCitation[]
): string => {
  if (!citations || citations.length === 0) return content;

  try {
    let processedContent = content;
    const linkedEntities = new Set<string>();

    // Entity patterns to match (case-insensitive)
    const entityPatterns = [
      // Airlines
      { pattern: /\b(Ryanair)\b/gi, category: 'airline' },
      { pattern: /\b(easyJet)\b/gi, category: 'airline' },
      { pattern: /\b(British Airways)\b/gi, category: 'airline' },
      { pattern: /\b(Aer Lingus)\b/gi, category: 'airline' },
      { pattern: /\b(Jet2)\b/gi, category: 'airline' },
      { pattern: /\b(Vueling)\b/gi, category: 'airline' },
      // Airports
      { pattern: /\b(Málaga Airport|AGP)\b/gi, category: 'airport' },
      { pattern: /\b(Dublin Airport)\b/gi, category: 'airport' },
      { pattern: /\b(Manchester Airport)\b/gi, category: 'airport' },
      { pattern: /\b(Gatwick Airport)\b/gi, category: 'airport' },
      // Government/Official
      { pattern: /\b(UK government|UK Government)\b/gi, category: 'government' },
      { pattern: /\b(Spanish government|Spanish Government)\b/gi, category: 'government' },
    ];

    // Process each citation
    citations.forEach((citation) => {
      try {
        const citationUrl = citation.url;
        if (!citationUrl) return;
        
        const sourceField = getCitationSource(citation);
        const sourceName = sourceField ? sourceField.toLowerCase() : '';

        // Try to match entity patterns with this citation
        entityPatterns.forEach(({ pattern, category }) => {
          const matches = [...processedContent.matchAll(pattern)];

          matches.forEach((match) => {
            const entity = match[0];
            const entityKey = entity.toLowerCase();

            // Only link first occurrence and skip if already linked
            if (linkedEntities.has(entityKey)) return;

            // Check if this citation is relevant to the entity
            const isRelevant =
              (sourceName && sourceName.includes(entity.toLowerCase())) ||
              (sourceName && sourceName.includes(category));

            if (isRelevant) {
              // Don't link if already inside a tag
              const beforeMatch = processedContent.substring(0, match.index);
              const lastOpenTag = beforeMatch.lastIndexOf('<');
              const lastCloseTag = beforeMatch.lastIndexOf('>');
              
              if (lastOpenTag > lastCloseTag) return; // Inside a tag

              // Create the link
              const link = `<a href="${citationUrl}" target="_blank" rel="noopener noreferrer" class="external-link">${entity}</a>`;
              
              // Replace first occurrence
              processedContent = processedContent.replace(entity, link);
              linkedEntities.add(entityKey);
            }
          });
        });
      } catch (citationError) {
        console.warn('Error processing citation:', citationError);
      }
    });

    return processedContent;
  } catch (error) {
    console.error('Error in injectExternalLinks:', error);
    return content; // Return original content on error
  }
};

/**
 * Converts [INTERNAL_LINK: text] markers to actual internal links
 */
export const processInternalLinks = (content: string): string => {
  const internalLinkPattern = /\[INTERNAL_LINK:\s*([^\]]+)\]/g;
  
  return content.replace(internalLinkPattern, (match, linkText) => {
    const slug = linkText
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    return `<a href="/blog/${slug}" class="internal-link font-medium text-primary hover:text-primary/80 transition-colors underline">${linkText}</a>`;
  });
};

/**
 * Adds citation superscript markers throughout the content
 */
export const addCitationMarkers = (
  content: string,
  citations: ExternalCitation[]
): string => {
  if (!citations || citations.length === 0) return content;

  try {
    let processedContent = content;

    // Keywords that indicate a claim needing citation
    const claimIndicators = [
      'flights',
      'airlines',
      'prices',
      'routes',
      'frequency',
      'direct',
      'non-stop',
      'terminals',
      'facilities',
      'transport',
      'connections',
      'visa',
      'passport',
      'requirements',
      'regulations',
    ];

    // Split content into sentences
    const sentences = processedContent.split(/\.\s+/);
    let citationIndex = 0;

    const processedSentences = sentences.map((sentence, idx) => {
      // Skip if already has a link or citation
      if (sentence.includes('<a href') || sentence.includes('<sup>')) {
        return sentence;
      }

      // Check if sentence contains claim indicators
      const hasClaim = claimIndicators.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      );

      // Add citation marker to qualifying sentences (but not too many)
      if (hasClaim && citationIndex < citations.length && idx % 3 === 0) {
        citationIndex++;
        return `${sentence}<sup class="citation-marker"><a href="#citation-${citationIndex}">[${citationIndex}]</a></sup>`;
      }

      return sentence;
    });

    return processedSentences.join('. ');
  } catch (error) {
    console.error('Error in addCitationMarkers:', error);
    return content; // Return original content on error
  }
};
