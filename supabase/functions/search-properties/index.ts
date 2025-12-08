import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NormalizedProperty {
  reference: string;
  price: number;
  currency: string;
  location: string;
  province: string;
  bedrooms: number;
  bathrooms: number;
  builtArea: number;
  plotArea?: number;
  propertyType: string;
  mainImage: string;
  images: string[];
  description: string;
  features: string[];
  pool?: string;
  garden?: string;
  parking?: string;
  orientation?: string;
  views?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract search parameters from request body
    const body = await req.json();
    const {
      location = '',
      priceMin,
      priceMax,
      propertyType = '',
      bedrooms,
      bathrooms,
      page = 1,
      limit = 20
    } = body;

    console.log('🔍 Searching properties via proxy:', { location, priceMin, priceMax, propertyType, bedrooms, bathrooms, page });

    // Call the proxy server
    const proxyUrl = 'http://188.34.164.137:3000/search';
    
    const proxyPayload = {
      location,
      priceMin,
      priceMax,
      propertyType,
      bedrooms,
      bathrooms,
      page,
      limit
    };

    console.log('📡 Calling proxy server:', proxyUrl);

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy server error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Normalize property data from proxy response
    const rawProperties = data.Properties || data.Property || data.properties || [];
    
    const properties: NormalizedProperty[] = rawProperties.map((prop: any) => ({
      reference: prop.Reference || prop.reference || '',
      price: prop.Price || prop.price || 0,
      currency: prop.Currency || prop.currency || 'EUR',
      location: prop.Location || prop.location || '',
      province: prop.Province || prop.province || '',
      bedrooms: prop.Bedrooms || prop.bedrooms || 0,
      bathrooms: prop.Bathrooms || prop.bathrooms || 0,
      builtArea: prop.BuiltArea || prop.builtArea || 0,
      plotArea: prop.PlotArea || prop.plotArea,
      propertyType: prop.PropertyType || prop.propertyType || '',
      mainImage: prop.MainImage || prop.mainImage || '',
      images: prop.Images || prop.images || [],
      description: prop.Description || prop.description || '',
      features: prop.Features || prop.features || [],
      pool: prop.Pool || prop.pool,
      garden: prop.Garden || prop.garden,
      parking: prop.Parking || prop.parking,
      orientation: prop.Orientation || prop.orientation,
      views: prop.Views || prop.views,
    }));

    console.log(`✅ Found ${properties.length} properties`);

    return new Response(
      JSON.stringify({
        properties,
        total: data.TotalResults || data.QueryInfo?.TotalResults || data.total || properties.length,
        page,
        limit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error searching properties:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
