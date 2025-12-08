import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  location?: string;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  page?: number;
  limit?: number;
}

interface ResalesProperty {
  Reference: string;
  Price: number;
  Currency: string;
  Location: string;
  Province: string;
  Bedrooms: number;
  Bathrooms: number;
  BuiltArea: number;
  PlotArea?: number;
  PropertyType: string;
  MainImage: string;
  Images?: string[];
  Description: string;
  Features?: string[];
  Pool?: string;
  Garden?: string;
  Parking?: string;
  Orientation?: string;
  Views?: string;
}

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
    // Get credentials from separate secrets (matching working implementation)
    const p1 = Deno.env.get('RESA_P1');
    const p2 = Deno.env.get('RESA_P2');
    
    if (!p1 || !p2) {
      throw new Error('RESA_P1 and RESA_P2 secrets not configured');
    }

    console.log('🔑 API credentials loaded');

    // Extract search parameters from either URL (GET) or body (POST)
    let location = '';
    let priceMin: number | undefined;
    let priceMax: number | undefined;
    let propertyType = '';
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;
    let page = 1;
    let limit = 20;

    if (req.method === 'POST') {
      const body = await req.json();
      location = body.location || '';
      priceMin = body.priceMin;
      priceMax = body.priceMax;
      propertyType = body.propertyType || '';
      bedrooms = body.bedrooms;
      bathrooms = body.bathrooms;
      page = body.page || 1;
      limit = body.limit || 20;
    } else {
      const { searchParams } = new URL(req.url);
      location = searchParams.get('location') || '';
      priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined;
      priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined;
      propertyType = searchParams.get('propertyType') || '';
      bedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined;
      bathrooms = searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined;
      page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
      limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    }

    console.log('🔍 Searching properties:', { location, priceMin, priceMax, propertyType, bedrooms, page });

    // Build Resales-Online API URL with CORRECT endpoint and parameters
    const baseUrl = 'https://webapi.resales-online.com/V6-0/SearchProperties.php';
    
    const params = new URLSearchParams({
      version: '6-0',
      service: 'SearchProperties',
      p_agency_filterid: '2',
      p1: p1,
      p2: p2,
      p_lang: 'en',
      p_PageNo: page.toString(),
      p_PageSize: limit.toString(),
    });
    
    // Add optional search filters (lowercase parameter names)
    if (location) params.append('p_location', location);
    if (priceMin) params.append('p_min', priceMin.toString());
    if (priceMax) params.append('p_max', priceMax.toString());
    if (propertyType) params.append('p_type', propertyType);
    if (bedrooms) params.append('p_beds', bedrooms.toString());
    if (bathrooms) params.append('p_baths', bathrooms.toString());

    const apiUrl = `${baseUrl}?${params.toString()}`;
    console.log('📡 Calling Resales API...');

    const response = await fetch(apiUrl);
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Resales-Online API error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw new Error(`Resales-Online API error: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    
    // Normalize property data
    const properties: NormalizedProperty[] = (data.Properties || data.Property || []).map((prop: ResalesProperty) => ({
      reference: prop.Reference,
      price: prop.Price,
      currency: prop.Currency || 'EUR',
      location: prop.Location,
      province: prop.Province,
      bedrooms: prop.Bedrooms,
      bathrooms: prop.Bathrooms,
      builtArea: prop.BuiltArea,
      plotArea: prop.PlotArea,
      propertyType: prop.PropertyType,
      mainImage: prop.MainImage,
      images: prop.Images || [],
      description: prop.Description,
      features: prop.Features || [],
      pool: prop.Pool,
      garden: prop.Garden,
      parking: prop.Parking,
      orientation: prop.Orientation,
      views: prop.Views,
    }));

    console.log(`✅ Found ${properties.length} properties`);

    return new Response(
      JSON.stringify({
        properties,
        total: data.TotalResults || data.QueryInfo?.TotalResults || properties.length,
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
