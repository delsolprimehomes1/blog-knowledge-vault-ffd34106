import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROXY_BASE_URL = 'http://188.34.164.137:3000';

interface PropertySubType {
  label: string;
  value: string;
}

interface PropertyType {
  label: string;
  value: string;
  subtypes: PropertySubType[];
}

// Only allow residential property types (Apartment: 1-1, House: 2-1)
const ALLOWED_MAIN_TYPE_VALUES = ['1-1', '2-1'];

// Static fallback data for when API is unavailable
const FALLBACK_PROPERTY_TYPES: PropertyType[] = [
  {
    label: 'Apartment',
    value: '1-1',
    subtypes: [
      { label: 'Ground Floor Apartment', value: '1-1-1' },
      { label: 'Middle Floor Apartment', value: '1-1-2' },
      { label: 'Top Floor Apartment', value: '1-1-3' },
      { label: 'Penthouse', value: '1-1-4' },
      { label: 'Duplex', value: '1-1-5' },
    ]
  },
  {
    label: 'House',
    value: '2-1',
    subtypes: [
      { label: 'Villa', value: '2-1-1' },
      { label: 'Townhouse', value: '2-1-2' },
      { label: 'Semi-Detached', value: '2-1-3' },
      { label: 'Detached', value: '2-1-4' },
      { label: 'Finca', value: '2-1-5' },
    ]
  }
];

// Module-level cache
let cachedPropertyTypes: PropertyType[] | null = null;
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
    if (cachedPropertyTypes && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
      console.log('Returning cached property types');
      return new Response(JSON.stringify({
        success: true,
        data: cachedPropertyTypes,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching property types from API...');
    let propertyTypes: PropertyType[] = [];
    let usedFallback = false;

    try {
      const response = await fetch(`${PROXY_BASE_URL}/property-types`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.log(`API returned ${response.status}, using fallback data`);
        propertyTypes = [...FALLBACK_PROPERTY_TYPES];
        usedFallback = true;
      } else {
        const apiData = await response.json();
        console.log('API response structure:', JSON.stringify(apiData).substring(0, 500));

        // Parse the response structure
        if (apiData?.success && apiData?.data?.PropertyTypes?.PropertyType) {
          const types = Array.isArray(apiData.data.PropertyTypes.PropertyType)
            ? apiData.data.PropertyTypes.PropertyType
            : [apiData.data.PropertyTypes.PropertyType];

          for (const type of types) {
            if (!type?.Type || !type?.OptionValue) continue;

            if (!ALLOWED_MAIN_TYPE_VALUES.includes(type.OptionValue)) {
              console.log(`Skipping non-residential type: ${type.Type} (${type.OptionValue})`);
              continue;
            }

            const mainType: PropertyType = {
              label: type.Type,
              value: type.OptionValue,
              subtypes: []
            };

            if (type.SubType) {
              const subtypes = Array.isArray(type.SubType) ? type.SubType : [type.SubType];
              for (const subtype of subtypes) {
                if (subtype?.Type && subtype?.OptionValue) {
                  mainType.subtypes.push({
                    label: subtype.Type,
                    value: subtype.OptionValue
                  });
                }
              }
            }

            propertyTypes.push(mainType);
          }
        }

        // If parsing failed, use fallback
        if (propertyTypes.length === 0) {
          console.log('No property types parsed from API, using fallback');
          propertyTypes = [...FALLBACK_PROPERTY_TYPES];
          usedFallback = true;
        }
      }
    } catch (fetchError) {
      console.log('API fetch failed, using fallback data:', fetchError);
      propertyTypes = [...FALLBACK_PROPERTY_TYPES];
      usedFallback = true;
    }

    console.log(`Returning ${propertyTypes.length} property types (fallback: ${usedFallback})`);

    // Update cache
    cachedPropertyTypes = propertyTypes;
    cacheTimestamp = now;

    return new Response(JSON.stringify({
      success: true,
      data: propertyTypes,
      count: propertyTypes.length,
      cached: false,
      fallback: usedFallback
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error fetching property types:', error);
    // Even on error, return fallback data instead of failing
    return new Response(JSON.stringify({
      success: true,
      data: FALLBACK_PROPERTY_TYPES,
      count: FALLBACK_PROPERTY_TYPES.length,
      cached: false,
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
