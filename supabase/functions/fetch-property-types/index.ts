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
    const response = await fetch(`${PROXY_BASE_URL}/property-types`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const apiData = await response.json();
    console.log('API response structure:', JSON.stringify(apiData).substring(0, 500));

    // Parse the response structure
    // Expected: { success: true, data: { PropertyTypes: { PropertyType: [...] } } }
    let propertyTypes: PropertyType[] = [];

    if (apiData?.success && apiData?.data?.PropertyTypes?.PropertyType) {
      const types = Array.isArray(apiData.data.PropertyTypes.PropertyType)
        ? apiData.data.PropertyTypes.PropertyType
        : [apiData.data.PropertyTypes.PropertyType];

      for (const type of types) {
        if (!type?.Type || !type?.OptionValue) continue;

        // Only include residential property types (Apartments and Houses)
        if (!ALLOWED_MAIN_TYPE_VALUES.includes(type.OptionValue)) {
          console.log(`Skipping non-residential type: ${type.Type} (${type.OptionValue})`);
          continue;
        }

        const mainType: PropertyType = {
          label: type.Type,
          value: type.OptionValue,
          subtypes: []
        };

        // Parse subtypes if available
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

    console.log(`Parsed ${propertyTypes.length} property types`);

    // Update cache
    cachedPropertyTypes = propertyTypes;
    cacheTimestamp = now;

    return new Response(JSON.stringify({
      success: true,
      data: propertyTypes,
      count: propertyTypes.length,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error fetching property types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch property types';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
