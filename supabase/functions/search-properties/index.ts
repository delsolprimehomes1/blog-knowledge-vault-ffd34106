import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: Record<string, number> = {
  en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13, hu: 14
};

// Proxy server URL
const PROXY_BASE_URL = 'http://188.34.164.137:3000';

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

// Call proxy server for property search
async function callProxySearch(filters: any, langNum: number, limit: number, page: number): Promise<any> {
  // Build query parameters for proxy
  const proxyParams: Record<string, string> = {
    lang: String(langNum),
    pageSize: String(limit),
    pageNo: String(page),
  };
  
  // Map filters to proxy format
  if (filters.location) proxyParams.location = filters.location;
  if (filters.sublocation) proxyParams.sublocation = filters.sublocation;
  // Default price range: €180,000 - €10,000,000
  proxyParams.minPrice = filters.priceMin ? String(filters.priceMin) : '180000';
  proxyParams.maxPrice = filters.priceMax ? String(filters.priceMax) : '10000000';
  // Default to apartments (1-1) and houses (2-1) for residential filtering if not specified
  proxyParams.propertyTypes = filters.propertyType || '1-1,2-1';
  if (filters.bedrooms) proxyParams.beds = String(filters.bedrooms);
  if (filters.bathrooms) proxyParams.baths = String(filters.bathrooms);
  if (filters.reference) proxyParams.reference = filters.reference;
  if (filters.newDevs === 'only') proxyParams.newDevelopment = 'true';

  const queryString = new URLSearchParams(proxyParams).toString();
  const requestUrl = `${PROXY_BASE_URL}/search?${queryString}`;

  console.log('🔄 Calling Proxy Server (GET) - /search');
  console.log('📤 Request URL:', requestUrl);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Proxy error:', response.status, errorText);
    throw new Error(`Proxy error: ${response.status} ${errorText}`.trim());
  }

  const data = await response.json();
  console.log('✅ Proxy response received, properties:', data.Property?.length || data.properties?.length || 0);
  
  // Handle both proxy response formats
  return {
    properties: data.Property || data.properties || [],
    total: data.QueryInfo?.PropertyCount || data.total || 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📦 Search request:', JSON.stringify(body));
    
    const { lang = 'en', page = 1, limit = 500, ...filters } = body;
    const langNum = LANGUAGE_MAP[lang] || 1;
    
    const effectiveFilters = { ...filters };
    
    const postBody = {
      ...effectiveFilters,
      pageSize: limit,
      pageNo: page,
      lang: langNum
    };

    let rawProperties: any[] = [];
    let total = 0;

    // Call proxy server
    const result = await callProxySearch(effectiveFilters, langNum, limit, page);
    rawProperties = result.properties;
    total = result.total;
    
    // Filter to residential only and normalize
    const residentialProperties = rawProperties.filter(isResidentialProperty);
    const properties = residentialProperties.map(normalizeProperty);
    
    console.log(`✅ Filtered ${rawProperties.length} → ${properties.length} residential properties`);
    
    return new Response(
      JSON.stringify({
        properties,
        total: total, // Use QueryInfo.PropertyCount from API, not filtered array length
        page,
        pageSize: limit,
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
