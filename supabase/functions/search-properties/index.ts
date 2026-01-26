import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: Record<string, number> = {
  en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13, hu: 14
};

// Proxy URL (primary)
const PROXY_BASE_URL = 'http://188.34.164.137:3000';

// Direct Resales Online API (fallback)
const RESALES_API_URL = 'https://webapi.resales-online.com/V6/SearchProperties';
const RESALES_API_KEY = Deno.env.get('RESALES_ONLINE_API_KEY') || '';
const RESA_P1 = Deno.env.get('RESA_P1') || '';
const RESA_P2 = Deno.env.get('RESA_P2') || '';

// Normalize property data from proxy PascalCase to frontend camelCase
function normalizeProperty(raw: any) {
  const propertyType = raw.PropertyType?.NameType || raw.PropertyType?.Type || 'Property';
  
  // Extract main image - try multiple paths
  const mainImage = 
    raw.Pictures?.Picture?.[0]?.PictureURL ||
    raw.MainImage ||
    raw.Pictures?.[0]?.PictureURL ||
    raw.Pictures?.[0] ||
    '';
  
  // Extract images array - handle nested Picture structure
  let images: string[] = [];
  if (raw.Pictures?.Picture && Array.isArray(raw.Pictures.Picture)) {
    images = raw.Pictures.Picture.map((p: any) => p.PictureURL || p).filter(Boolean);
  } else if (Array.isArray(raw.Pictures)) {
    images = raw.Pictures.map((p: any) => typeof p === 'string' ? p : p.PictureURL || p).filter(Boolean);
  }
  
  return {
    reference: raw.Reference || '',
    price: parseInt(raw.Price) || 0,
    priceMax: raw.PriceMax ? parseInt(raw.PriceMax) : undefined,
    currency: raw.Currency || 'EUR',
    location: raw.Location || '',
    province: raw.Province || '',
    bedrooms: parseInt(raw.Bedrooms) || 0,
    bedroomsMax: raw.BedroomsMax ? parseInt(raw.BedroomsMax) : undefined,
    bathrooms: parseInt(raw.Bathrooms) || 0,
    bathroomsMax: raw.BathroomsMax ? parseInt(raw.BathroomsMax) : undefined,
    builtArea: parseInt(raw.Built) || 0,
    builtAreaMax: raw.BuiltMax ? parseInt(raw.BuiltMax) : undefined,
    plotArea: raw.GardenPlot ? parseInt(raw.GardenPlot) : undefined,
    propertyType: propertyType,
    mainImage: mainImage,
    images: images,
    description: raw.Description || '',
    features: extractFeatures(raw.PropertyFeatures),
    pool: raw.Pool ? 'Yes' : undefined,
    garden: raw.Garden ? 'Yes' : undefined,
    parking: raw.Parking ? 'Yes' : undefined,
    orientation: extractFeatureValue(raw.PropertyFeatures, 'Orientation'),
    views: extractFeatureValue(raw.PropertyFeatures, 'Views'),
  };
}

// Extract features array from PropertyFeatures
function extractFeatures(propertyFeatures: any): string[] {
  if (!propertyFeatures?.Category) return [];
  
  const features: string[] = [];
  for (const cat of propertyFeatures.Category) {
    if (cat.Value && Array.isArray(cat.Value)) {
      features.push(...cat.Value);
    }
  }
  return features;
}

// Extract specific feature value
function extractFeatureValue(propertyFeatures: any, typeName: string): string | undefined {
  if (!propertyFeatures?.Category) return undefined;
  
  const category = propertyFeatures.Category.find((c: any) => c.Type === typeName);
  if (category?.Value && Array.isArray(category.Value)) {
    return category.Value.join(', ');
  }
  return undefined;
}

// Commercial keywords to exclude
const EXCLUDED_KEYWORDS = ['garage', 'parking', 'storage', 'commercial', 'plot', 'land', 'office', 'warehouse'];

// Filter to only include residential properties
function isResidentialProperty(property: any): boolean {
  const typeId = property.PropertyType?.TypeId || '';
  const typeName = (property.PropertyType?.NameType || '').toLowerCase();
  const subtype = (property.PropertyType?.Subtype1 || '').toLowerCase();
  
  // Must start with 1- (Apartments) or 2- (Houses)
  const isResidentialType = typeId.startsWith('1-') || typeId.startsWith('2-');
  
  // Exclude if name contains commercial keywords
  const hasExcludedKeyword = EXCLUDED_KEYWORDS.some(keyword => 
    typeName.includes(keyword) || subtype.includes(keyword)
  );
  
  return isResidentialType && !hasExcludedKeyword;
}

// Call Resales Online API directly (fallback)
async function callResalesAPIDirect(filters: any, langNum: number, limit: number, page: number): Promise<any> {
  if (!RESALES_API_KEY) {
    throw new Error('RESALES_ONLINE_API_KEY not configured');
  }
  
  // Build API parameters
  const apiParams: Record<string, any> = {
    p1: RESA_P1,
    p2: RESA_P2,
    P_Lang: langNum,
    P_sandbox: 'false',
    P_PageSize: limit,
    P_PageNo: page,
  };
  
  // Map filters to Resales Online API format
  if (filters.location) apiParams.P_Location = filters.location;
  if (filters.sublocation) apiParams.P_SubArea = filters.sublocation;
  if (filters.priceMin) apiParams.P_PriceMin = filters.priceMin;
  if (filters.priceMax) apiParams.P_PriceMax = filters.priceMax;
  if (filters.propertyType) apiParams.P_PropertyTypes = filters.propertyType;
  if (filters.bedrooms) apiParams.P_Bedrooms = filters.bedrooms;
  if (filters.bathrooms) apiParams.P_Bathrooms = filters.bathrooms;
  if (filters.reference) apiParams.P_RefId = filters.reference;
  
  // New Developments filter
  if (filters.newDevs === 'only') {
    apiParams.P_New_Devs = '1';
  }
  
  console.log('🔄 Fallback: Calling Resales Online API directly');
  console.log('📤 API params:', JSON.stringify(apiParams));
  
  const response = await fetch(RESALES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiParams),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Direct API error:', response.status, errorText);
    throw new Error(`Resales API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Direct API response received, properties:', data.Property?.length || 0);
  
  return {
    properties: data.Property || [],
    total: data.QueryInfo?.PropertyCount || 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📦 Search request:', JSON.stringify(body));
    
    const { lang = 'en', page = 1, limit = 20, ...filters } = body;
    const langNum = LANGUAGE_MAP[lang] || 1;
    
    // Set default minimum price for New Developments
    const effectiveFilters = { ...filters };
    if (filters.newDevs === 'only' && !filters.priceMin) {
      effectiveFilters.priceMin = 500000;
      console.log('💰 Applied default minPrice: €500,000 for New Developments');
    }
    
    const postBody = {
      ...effectiveFilters,
      pageSize: limit,
      pageNo: page,
      lang: langNum
    };

    let rawProperties: any[] = [];
    let total = 0;
    let source = 'proxy';

    // Try proxy first
    try {
      const proxyUrl = `${PROXY_BASE_URL}/search`;
      console.log('🌐 POST to proxy:', proxyUrl, JSON.stringify(postBody));
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        console.warn(`⚠️ Proxy returned ${response.status}, trying direct API fallback...`);
        throw new Error(`Proxy error: ${response.status}`);
      }

      const data = await response.json();
      rawProperties = data.properties || [];
      total = data.total || rawProperties.length;
      console.log(`✅ Proxy returned ${rawProperties.length} properties`);
    } catch (proxyError) {
      // Fallback to direct Resales Online API
      console.log('🔄 Proxy failed, using direct API fallback');
      source = 'direct-api';
      
      try {
        const directResult = await callResalesAPIDirect(effectiveFilters, langNum, limit, page);
        rawProperties = directResult.properties;
        total = directResult.total;
      } catch (directError: any) {
        console.error('❌ Direct API fallback also failed:', directError?.message);
        throw new Error(`Both proxy and direct API failed: ${directError?.message || 'Unknown error'}`);
      }
    }
    
    // Filter to residential only and normalize
    const residentialProperties = rawProperties.filter(isResidentialProperty);
    const properties = residentialProperties.map(normalizeProperty);
    
    console.log(`✅ Filtered ${rawProperties.length} → ${properties.length} residential properties (source: ${source})`);
    
    return new Response(
      JSON.stringify({
        properties,
        total: properties.length,
        page,
        pageSize: limit,
        source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
