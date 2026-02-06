import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditRequest {
  auditId: string;
  scanTypes: ('internal' | 'external' | 'navigation')[];
  contentTypes: ('blog' | 'qa' | 'comparison' | 'location')[];
  sampleSize?: number;
}

interface LinkResult {
  url: string;
  linkType: string;
  sourceType: string;
  sourceId?: string;
  sourceSlug?: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  isBroken: boolean;
  errorMessage?: string;
  redirectUrl?: string;
}

// Navigation links to audit (hardcoded from footer/header)
const navigationLinks = [
  { url: '/en/properties', type: 'internal', source: 'footer' },
  { url: '/en/locations', type: 'internal', source: 'footer' },
  { url: '/about', type: 'internal', source: 'footer' },
  { url: '/en/buyers-guide', type: 'internal', source: 'footer' },
  { url: '/en/blog', type: 'internal', source: 'footer' },
  { url: '/en/glossary', type: 'internal', source: 'footer' },
  { url: '/en/compare', type: 'internal', source: 'footer' },
  { url: '/en/contact', type: 'internal', source: 'footer' },
  { url: '/crm/agent/login', type: 'internal', source: 'footer' },
  { url: '/privacy', type: 'internal', source: 'footer' },
  { url: '/terms', type: 'internal', source: 'footer' },
  // Social links
  { url: 'https://www.facebook.com/delsolprimehomes', type: 'external', source: 'social' },
  { url: 'https://www.instagram.com/delsolprimehomes', type: 'external', source: 'social' },
  { url: 'https://www.linkedin.com/company/delsolprimehomes', type: 'external', source: 'social' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auditId, scanTypes, contentTypes, sampleSize } = await req.json() as AuditRequest;

    if (!auditId) {
      throw new Error('Audit ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting link audit ${auditId}`);
    console.log(`Scan types: ${scanTypes.join(', ')}`);
    console.log(`Content types: ${contentTypes.join(', ')}`);

    // Update audit status to running
    await supabase
      .from('link_audits')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', auditId);

    const allResults: LinkResult[] = [];
    let totalLinks = 0;
    let healthyLinks = 0;
    let brokenLinks = 0;
    let redirectLinks = 0;
    let timeoutLinks = 0;

    // Scan internal links from content
    if (scanTypes.includes('internal')) {
      console.log('Scanning internal links...');
      
      for (const contentType of contentTypes) {
        const internalResults = await scanInternalLinks(supabase, contentType, sampleSize);
        allResults.push(...internalResults);
      }
    }

    // Scan external links from content
    if (scanTypes.includes('external')) {
      console.log('Scanning external links...');
      
      for (const contentType of contentTypes) {
        const externalResults = await scanExternalLinks(supabase, contentType, sampleSize);
        allResults.push(...externalResults);
      }
    }

    // Scan navigation links
    if (scanTypes.includes('navigation')) {
      console.log('Scanning navigation links...');
      
      for (const navLink of navigationLinks) {
        const result = await checkLink(
          navLink.url, 
          'navigation', 
          navLink.source,
          undefined,
          undefined,
          supabaseUrl
        );
        allResults.push(result);
      }
    }

    // Calculate totals
    for (const result of allResults) {
      totalLinks++;
      if (result.isBroken) {
        brokenLinks++;
      } else if (result.httpStatus && result.httpStatus >= 300 && result.httpStatus < 400) {
        redirectLinks++;
      } else if (result.errorMessage?.includes('timeout')) {
        timeoutLinks++;
      } else {
        healthyLinks++;
      }
    }

    // Save results to database in batches
    const batchSize = 100;
    for (let i = 0; i < allResults.length; i += batchSize) {
      const batch = allResults.slice(i, i + batchSize);
      const records = batch.map(r => ({
        audit_id: auditId,
        link_url: r.url,
        link_type: r.linkType,
        source_type: r.sourceType,
        source_id: r.sourceId || null,
        source_slug: r.sourceSlug || null,
        http_status: r.httpStatus,
        response_time_ms: r.responseTimeMs,
        is_broken: r.isBroken,
        error_message: r.errorMessage || null,
        redirect_url: r.redirectUrl || null,
      }));

      await supabase.from('link_audit_results').insert(records);
    }

    // Update audit with final results
    await supabase
      .from('link_audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_links: totalLinks,
        healthy_links: healthyLinks,
        broken_links: brokenLinks,
        redirect_links: redirectLinks,
        timeout_links: timeoutLinks,
      })
      .eq('id', auditId);

    console.log(`Audit complete: ${totalLinks} total, ${healthyLinks} healthy, ${brokenLinks} broken`);

    return new Response(
      JSON.stringify({
        success: true,
        auditId,
        totalLinks,
        healthyLinks,
        brokenLinks,
        redirectLinks,
        timeoutLinks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audit-all-links:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function scanInternalLinks(
  supabase: any, 
  contentType: string, 
  sampleSize?: number
): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  
  const tableName = getTableName(contentType);
  if (!tableName) return results;

  let query = supabase
    .from(tableName)
    .select('id, slug, internal_links')
    .eq('status', 'published')
    .not('internal_links', 'is', null);

  if (sampleSize) {
    query = query.limit(sampleSize);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${contentType}:`, error);
    return results;
  }

  for (const item of data || []) {
    const internalLinks = item.internal_links as { url: string; anchor: string }[];
    if (!Array.isArray(internalLinks)) continue;

    for (const link of internalLinks) {
      if (!link.url) continue;
      
      // For internal links, we check if the route exists in the database
      const result = await validateInternalLink(supabase, link.url, contentType, item.id, item.slug);
      results.push(result);
    }
  }

  return results;
}

async function scanExternalLinks(
  supabase: any, 
  contentType: string, 
  sampleSize?: number
): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  
  const tableName = getTableName(contentType);
  if (!tableName) return results;

  const contentField = contentType === 'qa' ? 'answer_content' : 'detailed_content';

  let query = supabase
    .from(tableName)
    .select(`id, slug, ${contentField}`)
    .eq('status', 'published');

  if (sampleSize) {
    query = query.limit(sampleSize);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${contentType}:`, error);
    return results;
  }

  const checkedUrls = new Set<string>();

  for (const item of data || []) {
    const content = item[contentField] || '';
    const externalUrls = extractExternalLinks(content);

    for (const url of externalUrls) {
      // Skip if already checked
      if (checkedUrls.has(url)) continue;
      checkedUrls.add(url);

      const result = await checkLink(url, 'external', contentType, item.id, item.slug);
      results.push(result);
    }
  }

  return results;
}

function extractExternalLinks(content: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[1];
    if (url.startsWith('http') && !url.includes('delsolprimehomes.com')) {
      links.push(url);
    }
  }

  return [...new Set(links)];
}

async function validateInternalLink(
  supabase: any,
  url: string,
  sourceType: string,
  sourceId: string,
  sourceSlug: string
): Promise<LinkResult> {
  // Extract the slug from the URL
  const urlParts = url.split('/').filter(Boolean);
  const slug = urlParts[urlParts.length - 1];

  // Try to find the target in various tables
  const tables = ['blog_articles', 'qa_pages', 'comparison_pages', 'location_pages'];
  
  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle();

    if (data) {
      const isPublished = data.status === 'published';
      return {
        url,
        linkType: 'internal',
        sourceType,
        sourceId,
        sourceSlug,
        httpStatus: isPublished ? 200 : 404,
        responseTimeMs: 0,
        isBroken: !isPublished,
        errorMessage: isPublished ? undefined : 'Target not published or not found',
      };
    }
  }

  return {
    url,
    linkType: 'internal',
    sourceType,
    sourceId,
    sourceSlug,
    httpStatus: 404,
    responseTimeMs: 0,
    isBroken: true,
    errorMessage: 'Target not found in database',
  };
}

async function checkLink(
  url: string,
  linkType: string,
  sourceType: string,
  sourceId?: string,
  sourceSlug?: string,
  baseUrl?: string
): Promise<LinkResult> {
  const startTime = Date.now();
  
  try {
    // For internal navigation links, prepend base URL
    let fullUrl = url;
    if (url.startsWith('/') && baseUrl) {
      fullUrl = baseUrl + url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(fullUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkAuditBot/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;
    const status = response.status;
    
    // Check for redirects
    let redirectUrl: string | undefined;
    if (status >= 300 && status < 400) {
      redirectUrl = response.headers.get('location') || undefined;
    }

    // Consider 2xx and 3xx as healthy, 4xx and 5xx as broken
    const isBroken = status >= 400;

    return {
      url,
      linkType,
      sourceType,
      sourceId,
      sourceSlug,
      httpStatus: status,
      responseTimeMs,
      isBroken,
      redirectUrl,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('aborted') || errorMessage.includes('timeout');

    return {
      url,
      linkType,
      sourceType,
      sourceId,
      sourceSlug,
      httpStatus: null,
      responseTimeMs,
      isBroken: true,
      errorMessage: isTimeout ? 'Request timeout' : errorMessage,
    };
  }
}

function getTableName(contentType: string): string | null {
  switch (contentType) {
    case 'blog': return 'blog_articles';
    case 'qa': return 'qa_pages';
    case 'comparison': return 'comparison_pages';
    case 'location': return 'location_pages';
    default: return null;
  }
}
