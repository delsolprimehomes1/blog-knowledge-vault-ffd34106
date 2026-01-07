// Perplexity-Powered Link Intelligence Analyzer

export interface PerplexityLinkAnalysis {
  url: string;
  isRelevant: boolean;
  relevanceScore: number; // 0-100
  contentSummary: string;
  language: string;
  recommendations: string[];
  alternativeSources: string[];
  authorityLevel: 'high' | 'medium' | 'low';
  isGovernmentSource: boolean;
  contentQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface BatchLinkAnalysisResult {
  analyses: Record<string, PerplexityLinkAnalysis>;
  overallQuality: number;
  improvementSuggestions: string[];
}

/**
 * Batch analyze multiple links using Perplexity AI
 */
export async function analyzeLinksWithPerplexity(
  articleContent: string,
  articleTopic: string,
  articleLanguage: string,
  links: string[],
  perplexityApiKey: string
): Promise<BatchLinkAnalysisResult> {
  
  const languageConfig: Record<string, string> = {
    'es': 'Spanish',
    'en': 'English',
    'nl': 'Dutch',
    'de': 'German',
  };

  const languageName = languageConfig[articleLanguage] || 'Spanish';

  const prompt = `You are an expert content quality analyst specializing in link validation and content relevance assessment.

**Task:** Analyze ALL of the following external links in the context of this article. Provide detailed intelligence about each link.

**Article Context:**
- Topic: "${articleTopic}"
- Language: ${languageName}
- Preview: ${articleContent.substring(0, 800)}...

**Links to Analyze:**
${links.map((link, i) => `${i + 1}. ${link}`).join('\n')}

**Analysis Requirements:**
For EACH link, provide:
1. **Relevance Score (0-100)**: How relevant is this link's content to the article?
2. **Content Summary**: Brief (2-3 sentences) description of what this link contains
3. **Language**: What language is the content in?
4. **Is Relevant**: true/false - Does this enhance the article?
5. **Recommendations**: Specific suggestions (e.g., "Replace with government source", "Update with newer data")
6. **Alternative Sources**: List 1-3 better alternatives if this link is poor quality
7. **Authority Level**: 'high' (government/.edu), 'medium' (established org), or 'low'
8. **Is Government Source**: true/false
9. **Content Quality**: 'excellent', 'good', 'fair', or 'poor'

**CRITICAL:** Return ONLY valid JSON in this EXACT format (no markdown, no explanations):
{
  "analyses": {
    "${links[0]}": {
      "url": "${links[0]}",
      "isRelevant": true,
      "relevanceScore": 85,
      "contentSummary": "Brief summary here",
      "language": "es",
      "recommendations": ["Suggestion 1", "Suggestion 2"],
      "alternativeSources": ["https://better-source.gob.es"],
      "authorityLevel": "high",
      "isGovernmentSource": true,
      "contentQuality": "excellent"
    }
  },
  "overallQuality": 75,
  "improvementSuggestions": ["Add more government sources", "Replace broken links"]
}`;

  console.log(`Analyzing ${links.length} links with Perplexity...`);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Accept': 'application/json',
      'User-Agent': 'LovableCitationBot/1.0 (https://delsolprimehomes.com)',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: `You are an expert link quality analyst. You MUST return ONLY valid JSON with no additional text, markdown, or explanations. Analyze all links thoroughly.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    const errorText = await response.text();
    console.error(`Perplexity API error: ${response.status}, isHtml: ${isHtml}`, errorText.substring(0, 200));
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;

  console.log('Perplexity response received:', analysisText.substring(0, 200));

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as BatchLinkAnalysisResult;

    // Validate structure
    if (!result.analyses || typeof result.analyses !== 'object') {
      throw new Error('Invalid analysis structure');
    }

    // Ensure all analyzed links have complete data
    Object.keys(result.analyses).forEach(url => {
      const analysis = result.analyses[url];
      if (!analysis.url) analysis.url = url;
      if (!analysis.recommendations) analysis.recommendations = [];
      if (!analysis.alternativeSources) analysis.alternativeSources = [];
      if (!analysis.contentSummary) analysis.contentSummary = 'No summary available';
      if (analysis.relevanceScore === undefined) analysis.relevanceScore = 50;
    });

    return result;
  } catch (parseError) {
    console.error('Failed to parse Perplexity response:', parseError);
    console.error('Raw response:', analysisText);
    throw new Error('Failed to parse link analysis response');
  }
}

/**
 * Discover better alternatives for a specific problematic link
 */
export async function discoverBetterAlternatives(
  originalUrl: string,
  articleTopic: string,
  articleLanguage: string,
  context: string,
  perplexityApiKey: string
): Promise<string[]> {
  
  const languageConfig: Record<string, { name: string; domains: string[] }> = {
    'es': { name: 'Spanish', domains: ['.gob.es', '.es'] },
    'en': { name: 'English', domains: ['.gov', '.gov.uk', '.edu'] },
    'nl': { name: 'Dutch', domains: ['.nl', '.overheid.nl'] },
    'de': { name: 'German', domains: ['.de', '.gov.de'] },
  };

  const config = languageConfig[articleLanguage] || languageConfig['es'];

  const prompt = `Find 3-5 HIGH-AUTHORITY alternative sources to replace this problematic link.

**Original (Broken/Poor) Link:** ${originalUrl}
**Article Topic:** "${articleTopic}"
**Context:** ${context}
**Required Language:** ${config.name}

**Requirements:**
- ALL sources MUST be in ${config.name} language
- Prioritize government domains (${config.domains.join(', ')})
- Sources must be authoritative and currently accessible
- Sources must directly relate to: "${articleTopic}"

Return ONLY a JSON array of URLs:
["https://example.gob.es/...", "https://example2.edu/..."]`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Accept': 'application/json',
      'User-Agent': 'LovableCitationBot/1.0 (https://delsolprimehomes.com)',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'Return only valid JSON arrays with URLs. No explanations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    console.error(`Perplexity API error: ${response.status}, isHtml: ${isHtml}`);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('No alternatives found');
}
