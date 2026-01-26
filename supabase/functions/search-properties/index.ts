import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: Record<string, number> = {
  en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13, hu: 14
};

// Direct Resales Online API
const RESALES_API_URL = 'https://webapi.resales-online.com/V6/SearchProperties';
const RESA_P1 = Deno.env.get('RESA_P1') || '';
// Some environments store the API key under this name
const RESALES_ONLINE_API_KEY = Deno.env.get('RESALES_ONLINE_API_KEY') || '';

function getP1Candidates(): Array<{ label: string; value: string }> {
  const candidates: Array<{ label: string; value: string }> = [];
  if (RESA_P1) candidates.push({ label: 'RESA_P1', value: RESA_P1 });
  if (RESALES_ONLINE_API_KEY && RESALES_ONLINE_API_KEY !== RESA_P1) {
    candidates.push({ label: 'RESALES_ONLINE_API_KEY', value: RESALES_ONLINE_API_KEY });
  }
  return candidates;
}

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

// Call Resales Online API directly using GET with query parameters
async function callResalesAPI(filters: any, langNum: number, limit: number, page: number): Promise<any> {
  const p1Candidates = getP1Candidates();
  if (p1Candidates.length === 0) {
    throw new Error('Missing Resales credential: RESA_P1 (or RESALES_ONLINE_API_KEY)');
  }

  let lastAttemptSummary = '';

  for (const p1Candidate of p1Candidates) {
    // Build query parameters - API requires GET with URL params (V6 - no p2 or sandbox)
    const apiParams: Record<string, string> = {
      p1: p1Candidate.value,
      P_Agency_FilterId: '1', // Required - default Sale filter
      P_Lang: String(langNum),
      P_PageSize: String(limit),
      P_PageNo: String(page),
    };
    
    // Map filters to Resales Online API format
    if (filters.location) apiParams.P_Location = filters.location;
    if (filters.sublocation) apiParams.P_SubArea = filters.sublocation;
    if (filters.priceMin) apiParams.P_PriceMin = String(filters.priceMin);
    if (filters.priceMax) apiParams.P_PriceMax = String(filters.priceMax);
    if (filters.propertyType) apiParams.P_PropertyTypes = filters.propertyType;
    if (filters.bedrooms) apiParams.P_Bedrooms = String(filters.bedrooms);
    if (filters.bathrooms) apiParams.P_Bathrooms = String(filters.bathrooms);
    if (filters.reference) apiParams.P_RefId = filters.reference;

    const queryString = new URLSearchParams(apiParams).toString();
    const requestUrl = `${RESALES_API_URL}?${queryString}`;

    console.log('🔄 Calling Resales Online API (GET) - V6');
    console.log(`🔑 Using key source: ${p1Candidate.label}`);
    console.log('📤 Request URL:', requestUrl.replace(p1Candidate.value, `[${p1Candidate.label}]`));

    const response = await fetch(requestUrl, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API response received, properties:', data.Property?.length || 0);
      return {
        properties: data.Property || [],
        total: data.QueryInfo?.PropertyCount || 0,
      };
    }

    const errorText = await response.text();
    console.error(`❌ API error (${p1Candidate.label}):`, response.status, errorText);
    lastAttemptSummary = `${p1Candidate.label} status=${response.status} body=${errorText || '(empty)'}`;

    // If it's NOT a 400, don't keep retrying - bubble up immediately.
    if (response.status !== 400) {
      throw new Error(`Resales API error: ${response.status} ${errorText}`.trim());
    }
  }

  throw new Error(`Resales API error: 400 (${lastAttemptSummary})`);
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

    // Call Resales Online API directly
    const result = await callResalesAPI(effectiveFilters, langNum, limit, page);
    rawProperties = result.properties;
    total = result.total;
    
    // Filter to residential only and normalize
    const residentialProperties = rawProperties.filter(isResidentialProperty);
    const properties = residentialProperties.map(normalizeProperty);
    
    console.log(`✅ Filtered ${rawProperties.length} → ${properties.length} residential properties`);
    
    return new Response(
      JSON.stringify({
        properties,
        total: properties.length,
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
