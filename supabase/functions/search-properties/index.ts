import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const apiKey = Deno.env.get('RESALES_ONLINE_API_KEY');
    
    if (!apiKey) {
      throw new Error('RESALES_ONLINE_API_KEY not configured');
    }

    // API key format: "AGENCY_ID|P1|P2"
    const [agencyId, p1, p2] = apiKey.split('|');
    if (!agencyId || !p1 || !p2) {
      throw new Error('RESALES_ONLINE_API_KEY is invalid. Expected format "AGENCY_ID|P1|P2"');
    }

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
      // Handle POST request from supabase.functions.invoke
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
      // Handle GET request with URL params
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

    // Build Resales-Online API URL
    const apiUrl = new URL('https://webapi.resales-online.com/V6/SearchProperties');
    apiUrl.searchParams.append('p_agency_filterid', agencyId);
    apiUrl.searchParams.append('P1', p1);
    apiUrl.searchParams.append('P2', p2);
    apiUrl.searchParams.append('P_Lang', 'en');
    
    if (location) apiUrl.searchParams.append('P_Location', location);
    if (priceMin) apiUrl.searchParams.append('P_Min', priceMin.toString());
    if (priceMax) apiUrl.searchParams.append('P_Max', priceMax.toString());
    if (propertyType) apiUrl.searchParams.append('P_Type', propertyType);
    if (bedrooms) apiUrl.searchParams.append('P_Beds', bedrooms.toString());
    if (bathrooms) apiUrl.searchParams.append('P_Baths', bathrooms.toString());
    
    // Pagination
    apiUrl.searchParams.append('P_PageSize', limit.toString());
    apiUrl.searchParams.append('P_PageNo', page.toString());

    // Call Resales-Online API
    const response = await fetch(apiUrl.toString());
    const responseText = await response.text();
    
    if (!response.ok) {
      // Log full error response from Resales-Online for easier debugging
      console.error('Resales-Online API raw error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw new Error(`Resales-Online API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    // Normalize property data
    const properties: NormalizedProperty[] = (data.Properties || []).map((prop: ResalesProperty) => ({
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
        total: data.TotalResults || properties.length,
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
