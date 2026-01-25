import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROXY_BASE_URL = 'http://188.34.164.137:3000';

// Static fallback locations for Costa del Sol when API is unavailable
const FALLBACK_LOCATIONS = [
  { label: 'Marbella', value: 'Marbella' },
  { label: 'Estepona', value: 'Estepona' },
  { label: 'Benahavís', value: 'Benahavís' },
  { label: 'Mijas', value: 'Mijas' },
  { label: 'Fuengirola', value: 'Fuengirola' },
  { label: 'Benalmádena', value: 'Benalmádena' },
  { label: 'Torremolinos', value: 'Torremolinos' },
  { label: 'Málaga', value: 'Málaga' },
  { label: 'Nerja', value: 'Nerja' },
  { label: 'Manilva', value: 'Manilva' },
  { label: 'Casares', value: 'Casares' },
  { label: 'Ojén', value: 'Ojén' },
  { label: 'Istán', value: 'Istán' },
  { label: 'Coin', value: 'Coin' },
  { label: 'Alhaurín el Grande', value: 'Alhaurín el Grande' },
  { label: 'Alhaurín de la Torre', value: 'Alhaurín de la Torre' },
  { label: 'Rincón de la Victoria', value: 'Rincón de la Victoria' },
  { label: 'Vélez-Málaga', value: 'Vélez-Málaga' },
  { label: 'Torrox', value: 'Torrox' },
  { label: 'Sotogrande', value: 'Sotogrande' },
];

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
    let locations: { label: string; value: string }[] = [];
    let usedFallback = false;

    try {
      const response = await fetch(`${PROXY_BASE_URL}/locations`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.log(`API returned ${response.status}, using fallback data`);
        locations = [...FALLBACK_LOCATIONS];
        usedFallback = true;
      } else {
        const apiData = await response.json();
        console.log('API response structure:', JSON.stringify(apiData).substring(0, 500));

        // Parse the response structure
        if (apiData?.success && apiData?.data?.LocationData) {
          const provinceArea = apiData.data.LocationData.ProvinceArea;
          
          if (provinceArea) {
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

        // If parsing failed, use fallback
        if (locations.length === 0) {
          console.log('No locations parsed from API, using fallback');
          locations = [...FALLBACK_LOCATIONS];
          usedFallback = true;
        }
      }
    } catch (fetchError) {
      console.log('API fetch failed, using fallback data:', fetchError);
      locations = [...FALLBACK_LOCATIONS];
      usedFallback = true;
    }

    // Remove duplicates and sort alphabetically
    const uniqueLocations = Array.from(
      new Map(locations.map(l => [l.value, l])).values()
    ).sort((a, b) => a.label.localeCompare(b.label));

    console.log(`Returning ${uniqueLocations.length} locations (fallback: ${usedFallback})`);

    // Update cache
    cachedLocations = uniqueLocations;
    cacheTimestamp = now;

    return new Response(JSON.stringify({
      success: true,
      data: uniqueLocations,
      count: uniqueLocations.length,
      cached: false,
      fallback: usedFallback
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error fetching locations:', error);
    // Even on error, return fallback data instead of failing
    return new Response(JSON.stringify({
      success: true,
      data: FALLBACK_LOCATIONS,
      count: FALLBACK_LOCATIONS.length,
      cached: false,
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
