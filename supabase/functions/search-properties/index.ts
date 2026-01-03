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
  priceMax?: number;
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
 * Parses price range from various field names (for New Developments with min/max prices)
 * Handles special case where API returns concatenated prices like "175000.749000"
 */
function parsePriceRange(prop: any): { price: number; priceMax?: number } {
  // First, check for dedicated PriceFrom/PriceTo fields (cleanest format)
  if (prop.PriceFrom !== undefined || prop.PriceTo !== undefined) {
    const min = parseInt(String(prop.PriceFrom || prop.Price || 0).replace(/[^0-9]/g, ''));
    const max = parseInt(String(prop.PriceTo || 0).replace(/[^0-9]/g, ''));
    console.log(`💰 Using PriceFrom/To: min=${min}, max=${max}`);
    return { price: min, priceMax: max > min ? max : undefined };
  }

  // Check for PriceMin/PriceMax fields
  if (prop.PriceMin !== undefined || prop.PriceMax !== undefined) {
    const min = parseInt(String(prop.PriceMin || prop.Price || 0).replace(/[^0-9]/g, ''));
    const max = parseInt(String(prop.PriceMax || 0).replace(/[^0-9]/g, ''));
    console.log(`💰 Using PriceMin/Max: min=${min}, max=${max}`);
    return { price: min, priceMax: max > min ? max : undefined };
  }

  // Get the raw Price value as string for analysis
  const rawPrice = String(prop.Price || prop.price || '0');
  console.log(`💰 Raw Price field value: "${rawPrice}"`);
  
  // CRITICAL: Handle hyphen-separated price ranges like "175000 - 749000"
  const dashSplit = rawPrice.split(/\s*[-–—]\s*/);
  if (dashSplit.length >= 2) {
    const min = parseInt(dashSplit[0].replace(/[^0-9]/g, ''), 10) || 0;
    const max = parseInt(dashSplit[1].replace(/[^0-9]/g, ''), 10) || 0;
    
    if (min > 0 && max > min) {
      console.log(`💰 DETECTED DASH RANGE: min=${min}, max=${max}`);
      return { price: min, priceMax: max };
    }
  }
  
  // Check if price contains a decimal point that might be a concatenated range
  // New Development prices may come as "175000.749000" meaning min=175000, max=749000
  if (rawPrice.includes('.')) {
    const parts = rawPrice.split('.');
    const beforeDecimal = parseInt(parts[0].replace(/[^0-9]/g, '')) || 0;
    const afterDecimal = parseInt(parts[1]?.replace(/[^0-9]/g, '') || '0') || 0;
    
    // If the decimal part is suspiciously long (5+ digits) and resembles a price (>10000),
    // it's likely a concatenated min.max format
    if (parts[1] && parts[1].length >= 5 && afterDecimal > 10000) {
      console.log(`💰 DETECTED CONCATENATED PRICE: min=${beforeDecimal}, max=${afterDecimal}`);
      return { 
        price: beforeDecimal, 
        priceMax: afterDecimal > beforeDecimal ? afterDecimal : undefined 
      };
    }
  }
  
  // Standard single price (use parseInt to remove any decimal portion)
  const singlePrice = parseInt(rawPrice.replace(/[^0-9]/g, '')) || 0;
  console.log(`💰 Single price: ${singlePrice}`);
  
  // Check OriginalPrice as potential max price
  const originalPrice = parseInt(String(prop.OriginalPrice || 0).replace(/[^0-9]/g, ''));
  
  return {
    price: singlePrice,
    priceMax: originalPrice > singlePrice ? originalPrice : undefined
  };
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

/**
 * Extracts the property type ID from various response structures
 */
function extractPropertyTypeId(prop: any): string {
  // Try various paths to get the type ID
  if (prop.PropertyType?.OptionValue) return String(prop.PropertyType.OptionValue);
  if (prop.PropertyType?.TypeId) return String(prop.PropertyType.TypeId);
  if (prop.PropertyType?.SubtypeId1) return String(prop.PropertyType.SubtypeId1);
  if (prop.TypeId) return String(prop.TypeId);
  if (prop.OptionValue) return String(prop.OptionValue);
  return '';
}

/**
 * Filters properties to only include residential types
 * Allowed: 1-x (Apartments), 2-x (Houses)
 * Excluded: 3-x (Plots), 4-x (Commercial)
 */
function filterResidentialProperties(properties: any[]): any[] {
  const ALLOWED_TYPE_PREFIXES = ['1-', '2-'];
  const COMMERCIAL_KEYWORDS = ['commercial', 'office', 'shop', 'warehouse', 'garage', 
                               'parking', 'storage', 'plot', 'land', 'bar', 'restaurant',
                               'hotel', 'hostel', 'mooring', 'stables', 'kiosk', 'nightclub'];
  
  return properties.filter(prop => {
    const typeId = extractPropertyTypeId(prop);
    
    // If we have a type ID, check if it starts with allowed prefix
    if (typeId) {
      const isResidential = ALLOWED_TYPE_PREFIXES.some(prefix => typeId.startsWith(prefix));
      if (!isResidential) {
        console.log(`🚫 Filtering out property ${prop.Reference} with type ID: ${typeId}`);
      }
      return isResidential;
    }
    
    // Fallback: check type name for commercial keywords
    const typeName = (prop.PropertyType?.Type || prop.PropertyType?.NameType || '').toLowerCase();
    if (typeName && COMMERCIAL_KEYWORDS.some(kw => typeName.includes(kw))) {
      console.log(`🚫 Filtering out property ${prop.Reference} by name: ${typeName}`);
      return false;
    }
    
    // If we can't determine type, include it (safer default)
    return true;
  });
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
    
    // For single property lookups by reference, don't force residential filter
    // For search results, default to residential types (Apartments: 1-1, Houses: 2-1)
    const isSinglePropertyLookup = !!reference;
    if (!isSinglePropertyLookup) {
      const effectivePropertyType = propertyType || '1-1,2-1';
      params.append('propertyType', effectivePropertyType);
      console.log(`🏠 Using property type filter: ${effectivePropertyType}`);
    } else if (propertyType) {
      params.append('propertyType', propertyType);
    }
    
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

    // For single property lookups, skip residential filter to allow viewing any property type
    // For search results, filter to only residential properties (Apartments: 1-x, Houses: 2-x)
    const filteredProperties = isSinglePropertyLookup 
      ? rawProperties 
      : filterResidentialProperties(rawProperties);
    console.log(`📦 After residential filter: ${filteredProperties.length} of ${totalReceived}`);

    // Normalize filtered properties
    const properties: NormalizedProperty[] = filteredProperties.map((prop: any) => {
      const propertyTypeStr = extractPropertyType(prop);
      const mainImage = extractMainImage(prop);
      const { price, priceMax } = parsePriceRange(prop);
      const allImages = extractAllImages(prop);
      
      const title = prop.Title || prop.Name || prop.PropertyName || 
                   `${propertyTypeStr} in ${prop.Location || prop.location || 'Costa del Sol'}`;

      return {
        id: prop.Reference || prop.reference || prop.Ref || '',
        reference: prop.Reference || prop.reference || prop.Ref || '',
        title,
        price,
        priceMax,
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

    // For single property lookups, return { property: ... } format
    // For search results, return { properties: [...] } format
    if (isSinglePropertyLookup) {
      if (properties.length > 0) {
        console.log(`🏠 Returning single property: ${properties[0].reference}`);
        return new Response(
          JSON.stringify({ property: properties[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log(`⚠️ Property not found for reference: ${reference}`);
        return new Response(
          JSON.stringify({ property: null, error: 'Property not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use filtered count for total to avoid showing "8000 results" with 0 properties displayed
    // This gives users accurate expectations about available results
    const adjustedTotal = properties.length > 0 
      ? parseInt(String(total)) || totalReceived
      : 0;

    const responseBody = {
      properties,
      total: adjustedTotal,
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
