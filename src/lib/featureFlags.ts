import { supabase } from "@/integrations/supabase/client";

/**
 * Feature flag system for safe, phased rollout of new functionality.
 * All flags default to 'false' in production to ensure backward compatibility.
 */

export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', `feature_${flagName}`)
      .single();

    if (error) {
      console.error(`Error fetching feature flag '${flagName}':`, error);
      return false; // Fail safe: default to disabled
    }

    return data?.setting_value === 'true';
  } catch (err) {
    console.error(`Exception checking feature flag '${flagName}':`, err);
    return false; // Fail safe: default to disabled
  }
}

/**
 * Available feature flags:
 * - 'multilingual_clusters': Enable multilingual cluster generation (10 languages per topic)
 * - 'enhanced_hreflang': Enable enhanced canonical/hreflang generation
 */
