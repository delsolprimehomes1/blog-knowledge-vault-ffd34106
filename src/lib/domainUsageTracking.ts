import { supabase } from "@/integrations/supabase/client";

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Track citation suggestion
 */
export async function trackCitationSuggested(citationUrl: string): Promise<void> {
  const domain = extractDomain(citationUrl);
  
  try {
    // Increment times_suggested
    const { data: existing } = await supabase
      .from('domain_usage_stats')
      .select('id, times_suggested')
      .eq('domain', domain)
      .single();

    if (existing) {
      await supabase
        .from('domain_usage_stats')
        .update({
          times_suggested: (existing.times_suggested || 0) + 1,
          last_suggested_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new entry
      await supabase
        .from('domain_usage_stats')
        .insert({
          domain,
          times_suggested: 1,
          last_suggested_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error tracking citation suggestion:', error);
  }
}

/**
 * Track citation usage (when added to article)
 */
export async function trackCitationUsed(citationUrl: string, articleId?: string): Promise<void> {
  const domain = extractDomain(citationUrl);
  
  try {
    // Increment total_uses
    const { data: existing } = await supabase
      .from('domain_usage_stats')
      .select('id, total_uses, times_suggested, articles_used_in')
      .eq('domain', domain)
      .single();

    if (existing) {
      const articlesUsedIn = existing.articles_used_in || 0;
      const newArticleCount = articleId ? articlesUsedIn + 1 : articlesUsedIn;
      
      await supabase
        .from('domain_usage_stats')
        .update({
          total_uses: (existing.total_uses || 0) + 1,
          times_suggested: (existing.times_suggested || 0) + 1, // Count usage as suggestion too
          articles_used_in: newArticleCount,
          last_used_at: new Date().toISOString(),
          last_suggested_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new entry
      await supabase
        .from('domain_usage_stats')
        .insert({
          domain,
          total_uses: 1,
          times_suggested: 1,
          articles_used_in: articleId ? 1 : 0,
          last_used_at: new Date().toISOString(),
          last_suggested_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error tracking citation usage:', error);
  }
}

/**
 * Get acceptance rate for a domain
 */
export async function getDomainAcceptanceRate(domain: string): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('domain_usage_stats')
      .select('total_uses, times_suggested')
      .eq('domain', domain)
      .single();

    if (!data || !data.times_suggested) return null;
    
    return (data.total_uses / data.times_suggested) * 100;
  } catch {
    return null;
  }
}
