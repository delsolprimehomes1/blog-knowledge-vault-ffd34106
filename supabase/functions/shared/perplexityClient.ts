// ============================================
// STANDARDIZED PERPLEXITY API CLIENT
// ============================================
// Use this module for all Perplexity API calls to ensure:
// 1. Consistent headers (avoids WAF blocks)
// 2. Standardized error handling with error codes
// 3. Proper logging without exposing secrets

export interface PerplexityError {
  error_code: string;
  upstreamStatus?: number;
  contentType?: string;
  userMessage: string;
  isHtml?: boolean;
  responseSnippet?: string;
}

export interface PerplexityResponse<T = any> {
  success: boolean;
  data?: T;
  error?: PerplexityError;
  latencyMs: number;
}

// Standardized headers for all Perplexity API calls
// These headers reduce the chance of WAF/Cloudflare blocks
const PERPLEXITY_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'LovableCitationBot/1.0 (https://delsolprimehomes.com)',
  'Content-Type': 'application/json',
};

const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Make a standardized Perplexity API call with proper error handling
 */
export async function callPerplexity<T = any>(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    search_domain_filter?: string[];
    search_recency_filter?: string;
  } = {}
): Promise<PerplexityResponse<T>> {
  const startTime = Date.now();
  
  if (!apiKey) {
    return {
      success: false,
      error: {
        error_code: 'PERPLEXITY_KEY_MISSING',
        userMessage: 'PERPLEXITY_API_KEY is not configured. Add it in secrets.',
      },
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch(PERPLEXITY_BASE_URL, {
      method: 'POST',
      headers: {
        ...PERPLEXITY_HEADERS,
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'sonar',
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 2000,
        ...(options.search_domain_filter && { search_domain_filter: options.search_domain_filter }),
        ...(options.search_recency_filter && { search_recency_filter: options.search_recency_filter }),
      }),
    });

    const latencyMs = Date.now() - startTime;
    const upstreamStatus = response.status;
    const contentType = response.headers.get('content-type') || 'unknown';
    
    const responseText = await response.text();
    const isHtml = contentType.includes('text/html') || responseText.trim().startsWith('<');
    
    // Sanitize response snippet (never include tokens)
    const sanitizedSnippet = responseText.substring(0, 300).replace(/Bearer [^\s"]+/gi, 'Bearer [REDACTED]');

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        return {
          success: true,
          data,
          latencyMs,
        };
      } catch {
        return {
          success: false,
          error: {
            error_code: 'PERPLEXITY_INVALID_JSON',
            upstreamStatus,
            contentType,
            userMessage: 'Perplexity returned invalid JSON despite success status.',
            responseSnippet: sanitizedSnippet,
          },
          latencyMs,
        };
      }
    }

    // Handle error responses - PRIORITIZE status codes over HTML detection
    // Map HTTP status to error code FIRST (fixes 401 being misclassified as WAF block)
    const errorCodeMap: Record<number, string> = {
      401: 'PERPLEXITY_AUTH_FAILED',
      402: 'PERPLEXITY_PAYMENT_REQUIRED',
      403: 'PERPLEXITY_FORBIDDEN',
      429: 'PERPLEXITY_RATE_LIMIT',
      500: 'PERPLEXITY_SERVER_ERROR',
      502: 'PERPLEXITY_BAD_GATEWAY',
      503: 'PERPLEXITY_UNAVAILABLE',
    };

    const userMessageMap: Record<number, string> = {
      401: 'Perplexity rejected the API key. Verify your key and account subscription.',
      402: 'Perplexity requires payment. Add billing to your API account.',
      403: 'Access forbidden. Check your API key permissions.',
      429: 'Rate limit exceeded. Wait a few minutes before trying again.',
      500: 'Perplexity server error. Try again later.',
      502: 'Perplexity gateway error. Try again later.',
      503: 'Perplexity is temporarily unavailable. Try again later.',
    };

    // Check for mapped status codes FIRST (before HTML detection)
    if (errorCodeMap[upstreamStatus]) {
      return {
        success: false,
        error: {
          error_code: errorCodeMap[upstreamStatus],
          upstreamStatus,
          contentType,
          userMessage: userMessageMap[upstreamStatus],
          responseSnippet: sanitizedSnippet,
        },
        latencyMs,
      };
    }

    // Only fall back to WAF detection for unmapped statuses with HTML content
    if (isHtml) {
      return {
        success: false,
        error: {
          error_code: 'PERPLEXITY_WAF_BLOCK',
          upstreamStatus,
          contentType,
          isHtml: true,
          userMessage: 'Perplexity is blocking requests with a security challenge. Try again in a few minutes.',
          responseSnippet: sanitizedSnippet,
        },
        latencyMs,
      };
    }

    // Generic error for other cases
    return {
      success: false,
      error: {
        error_code: 'PERPLEXITY_API_ERROR',
        upstreamStatus,
        contentType,
        userMessage: `Perplexity returned HTTP ${upstreamStatus}`,
        responseSnippet: sanitizedSnippet,
      },
      latencyMs,

  } catch (error) {
    return {
      success: false,
      error: {
        error_code: 'PERPLEXITY_NETWORK_ERROR',
        userMessage: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract content from Perplexity response
 */
export function extractContent(data: any): string {
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Extract citations from Perplexity response
 */
export function extractCitations(data: any): string[] {
  return data?.citations || [];
}
