import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: Record<string, number> = {
  en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13
};

// Normalize property data from proxy PascalCase to frontend camelCase
function normalizeProperty(raw: any) {
  const propertyType = raw.PropertyType?.NameType || raw.PropertyType?.Type || 'Property';
  
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
    mainImage: raw.MainImage || '',
    images: raw.Pictures || [],
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📦 Search request:', JSON.stringify(body));
    
    const { lang = 'en', page = 1, limit = 20, ...filters } = body;
    const langNum = LANGUAGE_MAP[lang] || 1;
    
    const postBody = {
      ...filters,
      pageSize: limit,
      pageNo: page,
      lang: langNum
    };

    const proxyUrl = 'http://188.34.164.137:3000/search';
    console.log('🌐 POST to proxy:', proxyUrl, JSON.stringify(postBody));
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    const rawProperties = data.properties || [];
    
    // Normalize all properties from PascalCase to camelCase
    const properties = rawProperties.map(normalizeProperty);
    
    console.log(`✅ Returning ${properties.length} normalized properties`);
    
    return new Response(
      JSON.stringify({
        properties,
        total: data.total || properties.length,
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
