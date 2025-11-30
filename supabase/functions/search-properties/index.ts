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
    const { searchParams } = new URL(req.url);
    const apiKey = Deno.env.get('RESALES_ONLINE_API_KEY');
    
    if (!apiKey) {
      throw new Error('RESALES_ONLINE_API_KEY not configured');
    }

    // Extract search parameters
    const location = searchParams.get('location') || '';
    const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined;
    const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined;
    const propertyType = searchParams.get('propertyType') || '';
    const bedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined;
    const bathrooms = searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

    console.log('🔍 Searching properties:', { location, priceMin, priceMax, propertyType, bedrooms, page });

    // Build Resales-Online API URL
    const apiUrl = new URL('https://webapi.resales-online.com/V6/SearchProperties');
    apiUrl.searchParams.append('P1', apiKey);
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
    
    if (!response.ok) {
      throw new Error(`Resales-Online API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
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
