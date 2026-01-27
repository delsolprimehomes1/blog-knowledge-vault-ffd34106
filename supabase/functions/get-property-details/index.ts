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

// Call proxy server to get property by reference
async function callProxyPropertyDetails(reference: string, langNum: number): Promise<any> {
  const requestUrl = `${PROXY_BASE_URL}/property/${encodeURIComponent(reference)}?lang=${langNum}`;

  console.log('🔄 Calling Proxy Server (GET) - /property/:reference');
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
  console.log('✅ Proxy response received');
  console.log('📦 Raw response keys:', Object.keys(data));
  console.log('📦 Property type:', typeof data.Property);
  console.log('📦 Property is array?:', Array.isArray(data.Property));
  
  // CRITICAL FIX: Handle BOTH object and array responses from proxy
  // The API returns Property as a direct object for single queries, not an array
  let rawProp = null;
  
  if (data.Property) {
    if (Array.isArray(data.Property)) {
      rawProp = data.Property[0];
      console.log('📦 Extracted from Property array');
    } else if (typeof data.Property === 'object') {
      rawProp = data.Property;
      console.log('📦 Extracted from Property object directly');
    }
  } else if (data.property) {
    rawProp = Array.isArray(data.property) ? data.property[0] : data.property;
    console.log('📦 Extracted from lowercase property');
  } else if (data.Reference) {
    rawProp = data;
    console.log('📦 Data is the property itself');
  }
  
  if (rawProp) {
    console.log('📦 Property Reference:', rawProp.Reference);
    console.log('📦 Property keys:', Object.keys(rawProp).slice(0, 15));
    console.log('📦 Pictures structure:', typeof rawProp.Pictures, rawProp.Pictures ? Object.keys(rawProp.Pictures) : 'none');
    // Log raw values for range debugging
    console.log('🔍 RAW Bedrooms:', JSON.stringify(rawProp.Bedrooms), 'Type:', typeof rawProp.Bedrooms);
    console.log('🔍 RAW BedroomsTo:', JSON.stringify(rawProp.BedroomsTo), 'Type:', typeof rawProp.BedroomsTo);
    console.log('🔍 RAW Built:', JSON.stringify(rawProp.Built), 'Type:', typeof rawProp.Built);
    console.log('🔍 RAW BuiltTo:', JSON.stringify(rawProp.BuiltTo), 'Type:', typeof rawProp.BuiltTo);
    console.log('🔍 RAW Price:', JSON.stringify(rawProp.Price), 'Type:', typeof rawProp.Price);
    console.log('🔍 RAW PriceTo:', JSON.stringify(rawProp.PriceTo), 'Type:', typeof rawProp.PriceTo);
    console.log('🔍 RAW BuiltTitle:', JSON.stringify(rawProp.BuiltTitle));
  } else {
    console.log('❌ Could not extract property from response');
  }
  
  return rawProp;
}

/**
 * Extracts main image URL - aligned with search-properties logic
 */
function extractMainImage(raw: any): string {
  return raw.Pictures?.Picture?.[0]?.PictureURL ||
         raw.MainImage ||
         raw.Pictures?.[0]?.PictureURL ||
         raw.Pictures?.[0] ||
         '';
}

/**
 * Extracts all image URLs - aligned with search-properties logic
 */
function extractImages(raw: any): string[] {
  let images: string[] = [];
  if (raw.Pictures?.Picture && Array.isArray(raw.Pictures.Picture)) {
    images = raw.Pictures.Picture.map((p: any) => p.PictureURL || p).filter(Boolean);
  } else if (Array.isArray(raw.Pictures)) {
    images = raw.Pictures.map((p: any) => typeof p === 'string' ? p : p.PictureURL || p).filter(Boolean);
  }
  return images;
}

/**
 * Extracts features from property data as flat list
 */
function extractFeatures(prop: any): string[] {
  const features: string[] = [];
  
  if (prop.HasPool === 'Yes' || prop.Pool === 'Yes' || prop.CommunityPool === 'Yes') {
    features.push('Pool');
  }
  if (prop.HasGarden === 'Yes' || prop.Garden === 'Yes') {
    features.push('Garden');
  }
  if (prop.Parking !== undefined && prop.Parking !== 'None' && prop.Parking !== '0') {
    features.push('Parking');
  }
  if (prop.AirConditioning === 'Yes' || prop.AC === 'Yes') {
    features.push('Air Conditioning');
  }
  if (prop.Heating === 'Yes') {
    features.push('Heating');
  }
  if (prop.Terrace === 'Yes') {
    features.push('Terrace');
  }
  if (prop.Garage === 'Yes') {
    features.push('Garage');
  }
  if (prop.Storage === 'Yes') {
    features.push('Storage Room');
  }
  if (prop.Lift === 'Yes' || prop.Elevator === 'Yes') {
    features.push('Elevator');
  }
  if (prop.Security === 'Yes' || prop.Security24h === 'Yes') {
    features.push('24h Security');
  }
  if (prop.Gym === 'Yes' || prop.CommunityGym === 'Yes') {
    features.push('Gym');
  }
  if (prop.Jacuzzi === 'Yes') {
    features.push('Jacuzzi');
  }
  if (prop.Sauna === 'Yes') {
    features.push('Sauna');
  }
  if (prop.SeaViews === 'Yes') {
    features.push('Sea Views');
  }
  if (prop.GolfViews === 'Yes') {
    features.push('Golf Views');
  }
  if (prop.MountainViews === 'Yes') {
    features.push('Mountain Views');
  }
  
  return features;
}

/**
 * Extracts feature categories from PropertyFeatures structure
 */
function extractFeatureCategories(propertyFeatures: any): Record<string, string[]> {
  if (!propertyFeatures) return {};
  
  const categories: Record<string, string[]> = {};
  
  // Handle PropertyFeatures.Category array structure
  if (propertyFeatures.Category && Array.isArray(propertyFeatures.Category)) {
    for (const cat of propertyFeatures.Category) {
      if (cat.Type && cat.Value) {
        const values = Array.isArray(cat.Value) ? cat.Value : [cat.Value];
        categories[cat.Type] = values.filter(Boolean);
      }
    }
  }
  
  // Also handle flat feature object structure
  if (propertyFeatures.Setting) {
    categories['Setting'] = Array.isArray(propertyFeatures.Setting) ? propertyFeatures.Setting : [propertyFeatures.Setting];
  }
  if (propertyFeatures.Pool) {
    categories['Pool'] = Array.isArray(propertyFeatures.Pool) ? propertyFeatures.Pool : [propertyFeatures.Pool];
  }
  if (propertyFeatures.Views) {
    categories['Views'] = Array.isArray(propertyFeatures.Views) ? propertyFeatures.Views : [propertyFeatures.Views];
  }
  if (propertyFeatures.Kitchen) {
    categories['Kitchen'] = Array.isArray(propertyFeatures.Kitchen) ? propertyFeatures.Kitchen : [propertyFeatures.Kitchen];
  }
  if (propertyFeatures.Security) {
    categories['Security'] = Array.isArray(propertyFeatures.Security) ? propertyFeatures.Security : [propertyFeatures.Security];
  }
  if (propertyFeatures.Garden) {
    categories['Garden'] = Array.isArray(propertyFeatures.Garden) ? propertyFeatures.Garden : [propertyFeatures.Garden];
  }
  if (propertyFeatures.Parking) {
    categories['Parking'] = Array.isArray(propertyFeatures.Parking) ? propertyFeatures.Parking : [propertyFeatures.Parking];
  }
  if (propertyFeatures.Climate) {
    categories['Climate Control'] = Array.isArray(propertyFeatures.Climate) ? propertyFeatures.Climate : [propertyFeatures.Climate];
  }
  if (propertyFeatures.Features) {
    categories['Features'] = Array.isArray(propertyFeatures.Features) ? propertyFeatures.Features : [propertyFeatures.Features];
  }
  
  return categories;
}

/**
 * Normalizes property data to a consistent format with all fields
 */
function normalizeProperty(prop: any) {
  // Log raw API values for debugging
  console.log('📊 Raw API values for ranges:');
  console.log('   Bedrooms:', prop.Bedrooms, 'BedroomsTo:', prop.BedroomsTo);
  console.log('   Bathrooms:', prop.Bathrooms, 'BathroomsTo:', prop.BathroomsTo);
  console.log('   Built:', prop.Built, 'BuiltTo:', prop.BuiltTo);
  console.log('   Price:', prop.Price, 'PriceTo:', prop.PriceTo);
  console.log('   PropertyType:', JSON.stringify(prop.PropertyType));
  console.log('   DevelopmentName:', prop.DevelopmentName, 'BuiltTitle:', prop.BuiltTitle);

  /**
   * Parse a range value that may be in format:
   * - "1 - 3" (string range) -> returns { min: 1, max: 3 }
   * - "65" (single value) -> returns { min: 65, max: 0 }
   * - 65 (number) -> returns { min: 65, max: 0 }
   */
  const parseRange = (value: any): { min: number; max: number } => {
    if (value === null || value === undefined) return { min: 0, max: 0 };
    
    // Handle string ranges like "1 - 3" or "65 - 138"
    if (typeof value === 'string' && value.includes(' - ')) {
      const parts = value.split(' - ');
      return {
        min: parseInt(parts[0].replace(/[^0-9]/g, '')) || 0,
        max: parseInt(parts[1].replace(/[^0-9]/g, '')) || 0
      };
    }
    
    // Handle single values
    const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return { min: isNaN(numVal) ? 0 : numVal, max: 0 };
  };

  // Parse numeric values (simple - no ranges)
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // If it's a range string, take just the first number
      if (value.includes(' - ')) {
        const parsed = parseFloat(value.split(' - ')[0].replace(/[^0-9.]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Parse max values from separate fields or range strings
  const parseMax = (minValue: any, maxField: any): number => {
    // If maxField is provided explicitly, use it
    if (maxField !== undefined && maxField !== null && maxField !== '') {
      const maxVal = parseNumeric(maxField);
      if (maxVal > 0) return maxVal;
    }
    // If minValue is a range string, extract the max
    if (typeof minValue === 'string' && minValue.includes(' - ')) {
      const parts = minValue.split(' - ');
      return parseNumeric(parts[1]);
    }
    return 0;
  };

  // Get location string
  const location = prop.Location || prop.Area || prop.Town || prop.City || 'Costa del Sol';
  const province = prop.Province || prop.Region || 'Málaga';

  // Extract images using aligned logic
  const mainImage = extractMainImage(prop);
  const images = extractImages(prop);
  
  // Log warning if no images found
  if (!mainImage && images.length === 0) {
    console.warn('⚠️ No images extracted. Raw Pictures data:', JSON.stringify(prop.Pictures || prop.pictures || 'none'));
  } else {
    console.log(`✅ Images extracted: mainImage=${mainImage ? 'yes' : 'no'}, images count=${images.length}`);
  }

  // Extract feature categories
  const featureCategories = extractFeatureCategories(prop.PropertyFeatures);
  console.log('📦 Feature categories:', Object.keys(featureCategories));

  // Detect if this is a new development from multiple sources
  const isNewDevelopment = 
    prop.NewDevelopment === 'Yes' || 
    prop.OffPlan === 'Yes' ||
    (featureCategories.Category && Array.isArray(featureCategories.Category) && 
      featureCategories.Category.some((c: string) => c.toLowerCase().includes('new development'))) ||
    (featureCategories.Condition && Array.isArray(featureCategories.Condition) &&
      featureCategories.Condition.some((c: string) => c.toLowerCase().includes('new construction')));
  
  console.log('🏗️ Is New Development:', isNewDevelopment, 'Category:', featureCategories.Category);

  // Get development name - try multiple fields, or extract from description
  let developmentName = prop.BuiltTitle || prop.DevelopmentName || prop.Development || prop.ResortName || '';
  
  // If no development name but it's a new development, try to extract from description
  // Format is typically: "New Development: Prices from €X to €Y. [Bedrooms: X - Y]..."
  // But sometimes the name is in the title or area
  if (!developmentName && isNewDevelopment && prop.Description) {
    // Check if description starts with a potential development name pattern
    const descStart = String(prop.Description).substring(0, 200);
    // Look for patterns like property type name that might indicate development
    if (prop.Area && !prop.Area.includes('Costa')) {
      developmentName = prop.SubLocation || '';
    }
  }
  
  // Parse ranges for bedrooms, bathrooms, built area, price
  const bedroomMin = parseNumeric(prop.Bedrooms || prop.BedroomsFrom);
  const bedroomMax = parseMax(prop.Bedrooms, prop.BedroomsTo);
  
  const bathroomMin = parseNumeric(prop.Bathrooms || prop.BathroomsFrom);
  const bathroomMax = parseMax(prop.Bathrooms, prop.BathroomsTo);
  
  const builtMin = parseNumeric(prop.Built || prop.BuiltArea || prop.BuiltM2);
  const builtMax = parseMax(prop.Built, prop.BuiltTo);
  
  const priceMin = parseNumeric(prop.Price || prop.CurrentPrice);
  const priceMax = parseMax(prop.Price, prop.PriceTo);
  
  console.log(`📊 Parsed ranges: Beds=${bedroomMin}-${bedroomMax}, Baths=${bathroomMin}-${bathroomMax}, Built=${builtMin}-${builtMax}, Price=${priceMin}-${priceMax}`);

  return {
    // Basic info
    reference: prop.Reference || prop.reference || '',
    propertyType: prop.PropertyType?.Type || (typeof prop.PropertyType === 'string' ? prop.PropertyType : null) || prop.Type || 'Property',
    location,
    province,
    
    // Price (with range support)
    price: priceMin,
    priceMax: priceMax,
    currency: prop.Currency || 'EUR',
    
    // Bedrooms/Bathrooms (with ranges for new developments)
    bedrooms: bedroomMin,
    bedroomsMax: bedroomMax,
    bathrooms: bathroomMin,
    bathroomsMax: bathroomMax,
    
    // Built/Plot area (with ranges)
    builtArea: builtMin,
    builtAreaMax: builtMax,
    plotArea: parseNumeric(prop.Plot || prop.PlotArea || prop.PlotM2),
    plotAreaMax: parseMax(prop.Plot, prop.PlotTo),
    
    // Additional size measurements
    interiorSize: parseNumeric(prop.InteriorFloorSpace || prop.Interior),
    interiorSizeMax: parseMax(prop.InteriorFloorSpace, prop.InteriorTo),
    terraceSize: parseNumeric(prop.TerraceArea || prop.Terrace),
    terraceSizeMax: parseMax(prop.TerraceArea, prop.TerraceTo),
    totalSize: parseNumeric(prop.TotalBuiltArea),
    totalSizeMax: parseMax(prop.TotalBuiltArea, prop.TotalBuiltAreaTo),
    
    // Images
    mainImage,
    images,
    
    // Description
    description: prop.Description || prop.FullDescription || prop.LongDescription || '',
    
    // Features (flat list and categorized)
    features: extractFeatures(prop),
    featureCategories,
    
    // Amenities
    pool: prop.HasPool === 'Yes' || prop.Pool === 'Yes' || prop.CommunityPool === 'Yes' ? 
          (prop.CommunityPool === 'Yes' ? 'Communal' : 'Private') : undefined,
    garden: prop.HasGarden === 'Yes' || prop.Garden === 'Yes' ?
            (prop.CommunityGarden === 'Yes' ? 'Communal' : 'Private') : undefined,
    parking: prop.Parking !== undefined && prop.Parking !== 'None' && prop.Parking !== '0' ?
             prop.Parking : undefined,
    orientation: prop.Orientation || '',
    views: prop.Views || '',
    
    // Development info
    developmentName,
    newDevelopment: isNewDevelopment,
    status: prop.Status || 'Available',
    
    // Construction details
    completionDate: prop.CompletionDate || prop.Completion || '',
    buildingLicense: prop.BuildingLicense || '',
    
    // Energy certificates - robustly extract string values
    // Handle BOTH EnergyRating and EnergyCertificate potentially being objects
    energyRating: (() => {
      // Check EnergyRating first
      if (typeof prop.EnergyRating === 'string' && prop.EnergyRating) {
        return prop.EnergyRating;
      }
      if (typeof prop.EnergyRating === 'object' && prop.EnergyRating?.EnergyRated) {
        return prop.EnergyRating.EnergyRated;
      }
      // Fallback to EnergyCertificate
      if (typeof prop.EnergyCertificate === 'string' && prop.EnergyCertificate) {
        return prop.EnergyCertificate;
      }
      if (typeof prop.EnergyCertificate === 'object' && prop.EnergyCertificate?.EnergyRated) {
        return prop.EnergyCertificate.EnergyRated;
      }
      return '';
    })(),
    co2Rating: (() => {
      // Check CO2Rating first
      if (typeof prop.CO2Rating === 'string' && prop.CO2Rating) {
        return prop.CO2Rating;
      }
      // Check EnergyRating object
      if (typeof prop.EnergyRating === 'object' && prop.EnergyRating?.CO2Rated) {
        return prop.EnergyRating.CO2Rated;
      }
      // Check EnergyCertificate object
      if (typeof prop.EnergyCertificate === 'object' && prop.EnergyCertificate?.CO2Rated) {
        return prop.EnergyCertificate.CO2Rated;
      }
      // Fallback to CO2Emissions
      if (prop.CO2Emissions) {
        return String(prop.CO2Emissions);
      }
      return '';
    })(),
    
    // Associated costs
    communityFees: parseNumeric(prop.CommunityFees || prop.Community_Fees_Year),
    ibi: parseNumeric(prop.IBI || prop.IBIFees),
    garbageTax: parseNumeric(prop.GarbageTax),
    
    // Payment terms
    reservationAmount: parseNumeric(prop.ReservationAmount),
    vatPercentage: parseNumeric(prop.VAT || prop.IVA) || 10,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, lang = 'en' } = await req.json();

    if (!reference) {
      throw new Error('Property reference is required');
    }

    const langNum = LANGUAGE_MAP[lang] || 1;
    console.log(`🏠 Fetching PropertyDetails for: ${reference} (lang: ${lang}/${langNum})`);

    // Call proxy server
    const rawProp = await callProxyPropertyDetails(reference, langNum);

    if (!rawProp) {
      console.log('❌ Property not found');
      return new Response(
        JSON.stringify({ property: null, error: 'Property not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the property data
    const property = normalizeProperty(rawProp);

    console.log(`✅ Property ${reference} normalized successfully`);
    console.log(`📊 Price: ${property.price} - ${property.priceMax}, Built: ${property.builtArea} - ${property.builtAreaMax}`);

    return new Response(
      JSON.stringify({ property, imageResolution: 'w400', source: 'proxy' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ PropertyDetails error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
