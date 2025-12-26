import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-debug',
};

interface NormalizedProperty {
  id: string;
  reference: string;
  title: string;
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

/**
 * Language code mapping for API
 */
const LANGUAGE_MAP: Record<string, number> = {
  en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13
};

/**
 * Extracts property type string from various formats
 */
function extractPropertyType(prop: any): string {
  if (typeof prop.PropertyType === 'object' && prop.PropertyType !== null) {
    return prop.PropertyType.NameType || prop.PropertyType.Type || prop.PropertyType.SubType1 || '';
  }
  if (typeof prop.propertyType === 'object' && prop.propertyType !== null) {
    return prop.propertyType.NameType || prop.propertyType.Type || prop.propertyType.SubType1 || '';
  }
  return prop.PropertyType || prop.propertyType || '';
}

/**
 * Extracts main image URL from various response structures
 */
function extractMainImage(prop: any): string {
  return prop.MainImage || 
         prop.mainImage ||
         prop.MainImageUrl || 
         prop.Pictures?.Picture?.[0]?.PictureURL ||
         prop.Picture?.MainImage || 
         prop.Pictures?.[0]?.PictureURL || 
         prop.pictures?.[0]?.url || 
         prop.images?.Picture?.[0]?.PictureURL || 
         '';
}

/**
 * Parses price from various field names
 */
function parsePrice(prop: any): number {
  const priceFields = ['Price', 'price', 'SalePrice', 'CurrentPrice', 'OriginalPrice'];
  
  for (const field of priceFields) {
    const value = prop[field];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = parseFloat(String(value).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  
  return 0;
}

/**
 * Extracts all images from a property
 */
function extractAllImages(prop: any): string[] {
  const images: string[] = [];
  
  // Try Pictures.Picture array
  if (prop.Pictures?.Picture && Array.isArray(prop.Pictures.Picture)) {
    for (const pic of prop.Pictures.Picture) {
      if (pic.PictureURL) images.push(pic.PictureURL);
    }
  }
  
  // Try direct Pictures array
  if (Array.isArray(prop.Pictures)) {
    for (const pic of prop.Pictures) {
      if (typeof pic === 'string') images.push(pic);
      else if (pic.PictureURL) images.push(pic.PictureURL);
      else if (pic.url) images.push(pic.url);
    }
  }
  
  // Try images array
  if (Array.isArray(prop.images)) {
    for (const img of prop.images) {
      if (typeof img === 'string') images.push(img);
      else if (img.url) images.push(img.url);
      else if (img.PictureURL) images.push(img.PictureURL);
    }
  }
  
  // Add main image if not already included
  const mainImage = extractMainImage(prop);
  if (mainImage && !images.includes(mainImage)) {
    images.unshift(mainImage);
  }
  
  return images;
}

serve(async (req) => {
  console.log('🚀 Search-properties function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body: any = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log('⚠️ Could not parse request body:', e);
      body = {};
    }
    
    console.log('📥 Request body:', JSON.stringify(body));
    
    const {
      reference = '',
      location = '',
      sublocation = '',
      priceMin,
      priceMax,
      propertyType = '',
      bedrooms,
      bathrooms,
      newDevs = '',
      page = 1,
      limit = 20,
      lang = 'en',
    } = body;

    // Build GET URL with query parameters
    const params = new URLSearchParams();
    
    if (location) params.append('location', location);
    if (sublocation) params.append('sublocation', sublocation);
    if (propertyType) params.append('propertyType', propertyType);
    if (bedrooms) params.append('bedrooms', String(bedrooms));
    if (bathrooms) params.append('bathrooms', String(bathrooms));
    if (priceMin) params.append('minPrice', String(priceMin));
    if (priceMax) params.append('maxPrice', String(priceMax));
    if (newDevs === 'only') params.append('newDevs', 'only');
    if (reference) params.append('reference', reference);
    params.append('pageSize', String(limit));
    params.append('pageNo', String(page));
    
    // Map language code to API language number
    const langNum = LANGUAGE_MAP[lang] || 1;
    params.append('lang', String(langNum));

    const proxyUrl = `http://188.34.164.137:3000/search?${params.toString()}`;

    console.log('📡 Calling proxy URL:', proxyUrl);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📥 Proxy response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy server error:', response.status, errorText);
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    console.log('📥 Response data keys:', Object.keys(responseData));

    // The proxy returns: { success: true, data: { Property: [...], QueryInfo: {...} } }
    // So we need to access responseData.data.Property
    const data = responseData.data || responseData;
    
    console.log('📥 Inner data keys:', Object.keys(data));

    // Get raw properties from response - check all possible paths
    let rawProperties: any[] = [];
    
    if (data.Property && Array.isArray(data.Property)) {
      rawProperties = data.Property;
      console.log('📦 Found properties at data.Property');
    } else if (data.Properties && Array.isArray(data.Properties)) {
      rawProperties = data.Properties;
      console.log('📦 Found properties at data.Properties');
    } else if (data.properties && Array.isArray(data.properties)) {
      rawProperties = data.properties;
      console.log('📦 Found properties at data.properties');
    } else if (Array.isArray(data)) {
      rawProperties = data;
      console.log('📦 Data is a direct array');
    } else {
      console.log('⚠️ Could not find properties array. Available keys:', Object.keys(data));
    }
    
    const totalReceived = rawProperties.length;
    console.log(`📦 Total properties received: ${totalReceived}`);
    
    if (totalReceived > 0) {
      console.log('📦 First property reference:', rawProperties[0].Reference);
    }

    // Normalize properties (NO FILTERING for now)
    const properties: NormalizedProperty[] = rawProperties.map((prop: any) => {
      const propertyTypeStr = extractPropertyType(prop);
      const mainImage = extractMainImage(prop);
      const price = parsePrice(prop);
      const allImages = extractAllImages(prop);
      
      const title = prop.Title || prop.Name || prop.PropertyName || 
                   `${propertyTypeStr} in ${prop.Location || prop.location || 'Costa del Sol'}`;

      return {
        id: prop.Reference || prop.reference || prop.Ref || '',
        reference: prop.Reference || prop.reference || prop.Ref || '',
        title,
        price,
        currency: prop.Currency || prop.currency || 'EUR',
        location: prop.Location || prop.location || prop.Area || '',
        province: prop.Province || prop.province || prop.Country || '',
        bedrooms: parseInt(prop.Bedrooms || prop.bedrooms) || 0,
        bathrooms: parseInt(prop.Bathrooms || prop.bathrooms) || 0,
        builtArea: parseFloat(prop.Built || prop.BuiltArea || prop.builtArea) || 0,
        plotArea: parseFloat(prop.GardenPlot || prop.PlotArea || prop.plotArea || prop.Plot) || undefined,
        propertyType: propertyTypeStr,
        mainImage,
        images: allImages,
        description: typeof prop.Description === 'string' ? prop.Description : '',
        features: prop.Features || prop.features || [],
        pool: prop.Pool || prop.pool,
        garden: prop.Garden || prop.garden,
        parking: prop.Parking || prop.parking,
        orientation: prop.Orientation || prop.orientation,
        views: prop.Views || prop.views,
      };
    });

    // Get total from QueryInfo
    const queryInfo = data.QueryInfo || {};
    const total = queryInfo.PropertyCount || 
                  queryInfo.TotalResults ||
                  data.TotalResults || 
                  data.total || 
                  totalReceived;

    console.log(`✅ Returning ${properties.length} properties, total from API: ${total}`);

    const responseBody = {
      properties,
      total: parseInt(String(total)) || totalReceived,
      page,
      pageSize: limit,
      queryInfo: {
        searchType: queryInfo.SearchType || 'Sale',
        propertyCount: queryInfo.PropertyCount,
        currentPage: queryInfo.CurrentPage,
      },
    };

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in search-properties:', error);
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
