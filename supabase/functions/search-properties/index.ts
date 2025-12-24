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

interface FilteredOutItem {
  reference: string;
  reason: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Detects if a property is a rental listing based on rental-specific fields.
 * ANY rental indicator = filtered out (sales-only purity)
 */
function isRentalListing(prop: any): { isRental: boolean; reason: string } {
  // Check RentalPeriod (e.g., "Week", "Month", "Long Season")
  if (prop.RentalPeriod && prop.RentalPeriod.trim() !== '') {
    return { isRental: true, reason: `Has RentalPeriod: "${prop.RentalPeriod}"` };
  }
  
  // Check various rental price fields
  const rentalPrice1 = parseFloat(prop.RentalPrice1 || '0');
  if (rentalPrice1 > 0) {
    return { isRental: true, reason: `Has RentalPrice1: €${rentalPrice1}` };
  }
  
  const rentalPrice2 = parseFloat(prop.RentalPrice2 || '0');
  if (rentalPrice2 > 0) {
    return { isRental: true, reason: `Has RentalPrice2: €${rentalPrice2}` };
  }
  
  const pricePerWeek = parseFloat(prop.PricePerWeek || prop.WeeklyPrice || '0');
  if (pricePerWeek > 0) {
    return { isRental: true, reason: `Has PricePerWeek: €${pricePerWeek}` };
  }
  
  const pricePerMonth = parseFloat(prop.PricePerMonth || prop.MonthlyPrice || '0');
  if (pricePerMonth > 0) {
    return { isRental: true, reason: `Has PricePerMonth: €${pricePerMonth}` };
  }
  
  // Check for rental-related property types or descriptions
  const propertyType = typeof prop.PropertyType === 'object' 
    ? (prop.PropertyType?.NameType || prop.PropertyType?.Type || '') 
    : (prop.PropertyType || '');
  
  if (propertyType.toLowerCase().includes('rental') || propertyType.toLowerCase().includes('holiday let')) {
    return { isRental: true, reason: `PropertyType indicates rental: "${propertyType}"` };
  }
  
  return { isRental: false, reason: '' };
}

/**
 * Parses and validates sale price from various field names.
 * Returns 0 if no valid sale price found.
 */
function parseSalePrice(prop: any): number {
  // Try multiple field names for sale price (DO NOT use rental prices as fallback!)
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

// ============================================
// LUXURY RESIDENTIAL FILTERING
// ============================================

/**
 * Property types to EXCLUDE (non-residential / non-luxury)
 */
const EXCLUDED_PROPERTY_TYPES = [
  'storage room', 'storage', 'trastero',
  'commercial premises', 'commercial', 'local comercial', 'local',
  'commercial plot', 'plot comercial',
  'parking space', 'parking', 'aparcamiento',
  'garage', 'garaje',
  'land', 'plot', 'terreno', 'parcela',
  'shop', 'tienda',
  'office', 'oficina',
  'warehouse', 'almacén', 'nave industrial', 'nave',
  'industrial', 'hotel', 'hostel', 'motel',
  'building', 'edificio'
];

/**
 * Checks if property type should be excluded (non-residential)
 */
function isExcludedPropertyType(propertyType: string): boolean {
  if (!propertyType) return false;
  const normalizedType = propertyType.toLowerCase().trim();
  return EXCLUDED_PROPERTY_TYPES.some(excluded => 
    normalizedType.includes(excluded) || normalizedType === excluded
  );
}

/**
 * Default minimum price for luxury positioning (€400,000)
 */
const DEFAULT_MIN_PRICE = 400000;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle GET requests or empty bodies gracefully
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {}; // Empty body for GET requests
    }
    
    // Check for debug mode (request body or header)
    const debugHeader = req.headers.get('x-debug');
    const isDebugMode = body.debug === true || debugHeader === '1' || debugHeader === 'true';
    
    // Check for diagnostic mode (lightweight health check)
    if (body.mode === 'diagnostic') {
      return handleDiagnosticMode(isDebugMode);
    }
    
    // ============================================
    // SINGLE PROPERTY LOOKUP BY REFERENCE
    // ============================================
    if (body.reference) {
      const lang = body.lang || 'en';
      console.log(`🔍 Single property lookup: ${body.reference} (lang: ${lang})`);
      return await handleSinglePropertyLookup(body.reference, lang, isDebugMode);
    }
    
    // ============================================
    // FORCE SALES-ONLY (NON-NEGOTIABLE)
    // ============================================
    // Override ANY transactionType to 'sale' - we do not support rentals
    const transactionType = 'sale';
    
    if (isDebugMode) {
      console.log('🔒 SALES-ONLY MODE ENFORCED');
      console.log('📥 Original transactionType from request:', body.transactionType);
      console.log('✅ Forced transactionType:', transactionType);
    }

    const {
      location = '',
      priceMin: requestedPriceMin,
      priceMax,
      propertyType = '',
      bedrooms,
      bathrooms,
      page = 1,
      limit = 20,
      lang = 'en'
    } = body;
    
    // Apply default minimum price for luxury positioning if not specified
    const priceMin = requestedPriceMin ?? DEFAULT_MIN_PRICE;

    // Call the proxy server
    const proxyUrl = 'http://188.34.164.137:3000/search';
    
    const proxyPayload = {
      location,
      transactionType, // Always 'sale'
      priceMin,
      priceMax,
      propertyType,
      bedrooms,
      bathrooms,
      page,
      limit,
      lang // Forward language for translated content
    };

    if (isDebugMode) {
      console.log('📡 Proxy URL:', proxyUrl);
      console.log('📤 Request payload:', JSON.stringify(proxyPayload, null, 2));
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy server error:', response.status, errorText);
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract query info for debugging
    const queryInfo = data.QueryInfo || {};
    
    if (isDebugMode) {
      console.log('📊 QueryInfo from Resales API:', JSON.stringify(queryInfo, null, 2));
      if (queryInfo.SearchType && queryInfo.SearchType !== 'Sale') {
        console.warn('⚠️ WARNING: SearchType is NOT "Sale":', queryInfo.SearchType);
      }
    }

    // Get raw properties from response
    const rawProperties = data.Properties || data.Property || data.properties || [];
    const totalReceived = rawProperties.length;
    
    if (isDebugMode) {
      console.log(`📦 Received ${totalReceived} properties from proxy`);
    }

    // ============================================
    // STRICT RENTAL FILTERING
    // ============================================
    const filteredOutItems: FilteredOutItem[] = [];
    const saleProperties: any[] = [];

    for (const prop of rawProperties) {
      const reference = prop.Reference || prop.reference || prop.Ref || 'unknown';
      
      // Step 1: Check if it's a rental listing
      const rentalCheck = isRentalListing(prop);
      if (rentalCheck.isRental) {
        filteredOutItems.push({ reference, reason: rentalCheck.reason });
        if (isDebugMode) {
          console.log(`🚫 FILTERED OUT ${reference}: ${rentalCheck.reason}`);
        }
        continue;
      }
      
      // Step 2: Validate sale price exists and is > 0
      const salePrice = parseSalePrice(prop);
      if (salePrice <= 0) {
        filteredOutItems.push({ reference, reason: `No valid sale Price (found: ${salePrice})` });
        if (isDebugMode) {
          console.log(`🚫 FILTERED OUT ${reference}: No valid sale Price`);
        }
        continue;
      }
      
      // Step 3: Filter out non-residential property types (luxury residential only)
      const propertyTypeStr = extractPropertyType(prop);
      if (isExcludedPropertyType(propertyTypeStr)) {
        filteredOutItems.push({ reference, reason: `Non-residential type: "${propertyTypeStr}"` });
        if (isDebugMode) {
          console.log(`🚫 FILTERED OUT ${reference}: Non-residential type "${propertyTypeStr}"`);
        }
        continue;
      }
      
      // Passed all checks - this is a valid luxury residential sale property
      saleProperties.push(prop);
    }

    const totalFilteredOut = filteredOutItems.length;
    const totalReturned = saleProperties.length;

    if (isDebugMode) {
      console.log(`✅ Valid sale properties: ${totalReturned}`);
      console.log(`❌ Filtered out: ${totalFilteredOut}`);
    }

    // ============================================
    // NORMALIZE PROPERTIES
    // ============================================
    const properties: NormalizedProperty[] = saleProperties.map((prop: any) => {
      const propertyTypeStr = extractPropertyType(prop);
      const mainImage = extractMainImage(prop);
      const salePrice = parseSalePrice(prop);
      
      const title = prop.Title || prop.Name || prop.PropertyName || 
                   `${propertyTypeStr} in ${prop.Location || prop.location || 'Costa del Sol'}`;

      return {
        id: prop.Reference || prop.reference || prop.Ref || '',
        reference: prop.Reference || prop.reference || prop.Ref || '',
        title,
        price: salePrice,
        currency: prop.Currency || prop.currency || 'EUR',
        location: prop.Location || prop.location || prop.Area || '',
        province: prop.Province || prop.province || prop.Country || '',
        bedrooms: parseInt(prop.Bedrooms || prop.bedrooms) || 0,
        bathrooms: parseInt(prop.Bathrooms || prop.bathrooms) || 0,
        builtArea: parseFloat(prop.BuiltArea || prop.builtArea || prop.Built) || 0,
        plotArea: parseFloat(prop.PlotArea || prop.plotArea || prop.Plot) || undefined,
        propertyType: propertyTypeStr,
        mainImage,
        images: prop.Images || prop.images || prop.Pictures || [],
        description: prop.Description || prop.description || '',
        features: prop.Features || prop.features || [],
        pool: prop.Pool || prop.pool,
        garden: prop.Garden || prop.garden,
        parking: prop.Parking || prop.parking,
        orientation: prop.Orientation || prop.orientation,
        views: prop.Views || prop.views,
      };
    });

    // Build response
    const responseBody: any = {
      properties,
      total: data.TotalResults || data.QueryInfo?.TotalResults || data.total || totalReturned,
      page,
      pageSize: limit,
      queryInfo: {
        searchType: queryInfo.SearchType || 'Sale',
        totalResults: queryInfo.TotalResults,
      },
    };

    // Add debug info if enabled
    if (isDebugMode) {
      responseBody.debug = {
        proxyUrl,
        requestBody: { ...proxyPayload, transactionType: 'sale (FORCED)' },
        queryInfo,
        totalReceived,
        totalFilteredOut,
        totalReturned,
        filteredSamples: filteredOutItems.slice(0, 5), // First 5 filtered items
      };
    }

    console.log(`✅ Returning ${totalReturned} SALE properties (filtered out ${totalFilteredOut} rentals)`);

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

/**
 * Handle single property lookup by reference
 */
async function handleSinglePropertyLookup(reference: string, lang: string, isDebugMode: boolean): Promise<Response> {
  const proxyUrl = `http://188.34.164.137:3000/property/${encodeURIComponent(reference)}?lang=${lang}`;
  
  if (isDebugMode) {
    console.log('📡 Property detail URL:', proxyUrl);
  }

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy property detail error:', response.status, errorText);
      
      // If property not found, return empty result
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ property: null, error: 'Property not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Proxy server error: ${response.status}`);
    }

    const data = await response.json();
    
    // The proxy should return property data - normalize it
    const prop = data.Property || data.property || data;
    
    if (!prop || (!prop.Reference && !prop.reference)) {
      return new Response(
        JSON.stringify({ property: null, error: 'Property not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract all images from the property
    const allImages = extractAllImages(prop);
    
    const propertyTypeStr = extractPropertyType(prop);
    const mainImage = extractMainImage(prop);
    const salePrice = parseSalePrice(prop);
    
    const title = prop.Title || prop.Name || prop.PropertyName || 
                 `${propertyTypeStr} in ${prop.Location || prop.location || 'Costa del Sol'}`;
    
    // Extract description - handle multi-language object using requested language
    let description = '';
    if (typeof prop.Description === 'object' && prop.Description !== null) {
      description = prop.Description[lang] || prop.Description.en || prop.Description.es || Object.values(prop.Description)[0] || '';
    } else {
      description = prop.Description || prop.description || '';
    }
    
    // Extract features from PropertyFeatures
    const features: string[] = [];
    if (prop.PropertyFeatures?.Category) {
      const categories = Array.isArray(prop.PropertyFeatures.Category) 
        ? prop.PropertyFeatures.Category 
        : [prop.PropertyFeatures.Category];
      
      for (const cat of categories) {
        if (cat.Value) {
          const values = Array.isArray(cat.Value) ? cat.Value : [cat.Value];
          features.push(...values);
        }
      }
    }

    const normalizedProperty = {
      id: prop.Reference || prop.reference || prop.Ref || '',
      reference: prop.Reference || prop.reference || prop.Ref || '',
      title,
      price: salePrice,
      currency: prop.Currency || prop.currency || 'EUR',
      location: prop.Location || prop.location || prop.Area || '',
      province: prop.Province || prop.province || prop.Country || '',
      bedrooms: parseInt(prop.Bedrooms || prop.bedrooms) || 0,
      bathrooms: parseInt(prop.Bathrooms || prop.bathrooms) || 0,
      builtArea: parseFloat(prop.BuiltArea || prop.builtArea || prop.Built) || 0,
      plotArea: parseFloat(prop.PlotArea || prop.plotArea || prop.GardenPlot || prop.Plot) || undefined,
      propertyType: propertyTypeStr,
      mainImage,
      images: allImages,
      description,
      features,
      pool: prop.Pool === 1 || prop.Pool === '1' ? 'Yes' : (prop.Pool || undefined),
      garden: prop.Garden === 1 || prop.Garden === '1' ? 'Yes' : (prop.Garden || undefined),
      parking: prop.Parking === 1 || prop.Parking === '1' ? 'Yes' : (prop.Parking || undefined),
      orientation: prop.Orientation || prop.orientation,
      views: prop.Views || prop.views,
    };

    console.log(`✅ Returning property: ${reference} with ${allImages.length} images`);

    return new Response(
      JSON.stringify({ 
        property: normalizedProperty,
        debug: isDebugMode ? { proxyUrl, rawPropertyKeys: Object.keys(prop) } : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching single property:', error);
    return new Response(
      JSON.stringify({ 
        property: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch property' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Extract all images from property data
 */
function extractAllImages(prop: any): string[] {
  const images: string[] = [];
  
  // Try Pictures array (Resales Online format)
  if (prop.Pictures?.Picture) {
    const pictureArray = Array.isArray(prop.Pictures.Picture) 
      ? prop.Pictures.Picture 
      : [prop.Pictures.Picture];
    
    for (const pic of pictureArray) {
      const url = pic.PictureURL || pic.URL || pic.url || pic;
      if (typeof url === 'string' && url.trim()) {
        images.push(url);
      }
    }
  }
  
  // Try Images array
  if (prop.Images) {
    const imageArray = Array.isArray(prop.Images) ? prop.Images : [prop.Images];
    for (const img of imageArray) {
      const url = typeof img === 'string' ? img : (img.url || img.URL || img.PictureURL);
      if (typeof url === 'string' && url.trim() && !images.includes(url)) {
        images.push(url);
      }
    }
  }
  
  // Try images (lowercase) array
  if (prop.images) {
    const imageArray = Array.isArray(prop.images) ? prop.images : [prop.images];
    for (const img of imageArray) {
      const url = typeof img === 'string' ? img : (img.url || img.URL || img.PictureURL);
      if (typeof url === 'string' && url.trim() && !images.includes(url)) {
        images.push(url);
      }
    }
  }
  
  return images;
}

/**
 * Lightweight diagnostic mode for health checks
 */
async function handleDiagnosticMode(isDebugMode: boolean): Promise<Response> {
  console.log('🔍 Running diagnostic mode...');
  
  const proxyUrl = 'http://188.34.164.137:3000/search';
  const testPayload = {
    transactionType: 'sale',
    location: '',
    page: 1,
    limit: 5, // Small sample
  };

  try {
    const startTime = Date.now();
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: `Proxy returned ${response.status}`,
          latency,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawProperties = data.Properties || data.Property || data.properties || [];
    
    // Count rental vs sale properties in sample
    let rentalCount = 0;
    let saleCount = 0;
    
    for (const prop of rawProperties) {
      const rentalCheck = isRentalListing(prop);
      const salePrice = parseSalePrice(prop);
      
      if (rentalCheck.isRental || salePrice <= 0) {
        rentalCount++;
      } else {
        saleCount++;
      }
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        proxyUrl,
        latency,
        queryInfo: data.QueryInfo || {},
        sampleSize: rawProperties.length,
        salePropertiesInSample: saleCount,
        rentalPropertiesInSample: rentalCount,
        message: rentalCount > 0 
          ? `⚠️ Proxy is still returning ${rentalCount} rental properties - check p_agency_filterid` 
          : '✅ All sample properties are valid sales',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Diagnostic failed',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
