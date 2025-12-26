import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROXY_BASE_URL = 'http://188.34.164.137:3000';

// Module-level cache
let cachedLocations: { label: string; value: string }[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache
    const now = Date.now();
    if (cachedLocations && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
      console.log('Returning cached locations');
      return new Response(JSON.stringify({
        success: true,
        data: cachedLocations,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching locations from API...');
    const response = await fetch(`${PROXY_BASE_URL}/locations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const apiData = await response.json();
    console.log('API response structure:', JSON.stringify(apiData).substring(0, 500));

    // Parse the response structure
    // Expected: { success: true, data: { LocationData: { ProvinceArea: { Locations: { Location: [...] } } } } }
    let locations: { label: string; value: string }[] = [];

    if (apiData?.success && apiData?.data?.LocationData) {
      const provinceArea = apiData.data.LocationData.ProvinceArea;
      
      if (provinceArea) {
        // Handle both single ProvinceArea and array of ProvinceAreas
        const areas = Array.isArray(provinceArea) ? provinceArea : [provinceArea];
        
        for (const area of areas) {
          if (area?.Locations?.Location) {
            const locationList = Array.isArray(area.Locations.Location) 
              ? area.Locations.Location 
              : [area.Locations.Location];
            
            for (const loc of locationList) {
              if (typeof loc === 'string' && loc.trim()) {
                locations.push({ label: loc.trim(), value: loc.trim() });
              }
            }
          }
        }
      }
    }

    // Remove duplicates and sort alphabetically
    const uniqueLocations = Array.from(
      new Map(locations.map(l => [l.value, l])).values()
    ).sort((a, b) => a.label.localeCompare(b.label));

    console.log(`Parsed ${uniqueLocations.length} unique locations`);

    // Update cache
    cachedLocations = uniqueLocations;
    cacheTimestamp = now;

    return new Response(JSON.stringify({
      success: true,
      data: uniqueLocations,
      count: uniqueLocations.length,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error fetching locations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch locations';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
