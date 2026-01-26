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
const RESA_P2 = Deno.env.get('RESA_P2') || '';
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

// Call Resales Online API directly to get property by reference
async function callResalesAPI(reference: string, langNum: number): Promise<any> {
  if (!RESA_P2) {
    throw new Error('Missing Resales credential: RESA_P2');
  }

  const p1Candidates = getP1Candidates();
  if (p1Candidates.length === 0) {
    throw new Error('Missing Resales credential: RESA_P1 (or RESALES_ONLINE_API_KEY)');
  }

  const sandboxValues: Array<'false' | 'true'> = ['false', 'true'];
  let lastAttemptSummary = '';

  for (const p1Candidate of p1Candidates) {
    for (const sandbox of sandboxValues) {
      const apiParams = {
        p1: p1Candidate.value,
        p2: RESA_P2,
        P_Lang: langNum,
        P_sandbox: sandbox,
        P_RefId: reference,
      };

      console.log('🔄 Calling Resales Online API for reference:', reference);
      console.log(`🔑 Using key source: ${p1Candidate.label}, sandbox=${sandbox}`);

      const response = await fetch(RESALES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiParams),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API response received');
        return data.Property?.[0] || null;
      }

      const errorText = await response.text();
      console.error(`❌ API error (${p1Candidate.label}, sandbox=${sandbox}):`, response.status, errorText);
      lastAttemptSummary = `${p1Candidate.label} sandbox=${sandbox} status=${response.status} body=${errorText || '(empty)'}`;

      if (response.status !== 400) {
        throw new Error(`Resales API error: ${response.status} ${errorText}`.trim());
      }
    }
  }

  throw new Error(`Resales API error: 400 (${lastAttemptSummary})`);
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

    // Call Resales Online API directly
    const rawProp = await callResalesAPI(reference, langNum);

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

    return new Response(
      JSON.stringify({ property }),
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

/**
 * Extracts main image URL from various response structures
 */
function extractMainImage(prop: any): string {
  return prop.MainImage || 
         prop.mainImage ||
         prop.MainImageUrl || 
         prop.BigPictureURL ||
         prop.LargePictureURL ||
         prop.OriginalPictureURL ||
         prop.Pictures?.Picture?.[0]?.PictureURL ||
         prop.Picture?.MainImage || 
         prop.Pictures?.[0]?.PictureURL || 
         prop.pictures?.[0]?.url || 
         prop.images?.Picture?.[0]?.PictureURL || 
         '';
}

/**
 * Extracts all image URLs from Pictures array
 */
function extractImages(prop: any): string[] {
  const pictures = prop.Pictures?.Picture || 
                   prop.Pictures || 
                   prop.pictures || 
                   prop.images?.Picture || 
                   [];
  
  if (Array.isArray(pictures)) {
    return pictures
      .map((p: any) => p.PictureURL || p.url || p.PictureUrl || p)
      .filter((url: any) => typeof url === 'string' && url.length > 0);
  }
  
  return [];
}

/**
 * Normalizes property data to a consistent format
 */
function normalizeProperty(prop: any) {
  // Extract features
  const extractFeatures = (): string[] => {
    const features: string[] = [];
    
    // Add boolean features
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
  };

  // Parse numeric values
  const parseNumeric = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Get location string
  const location = prop.Location || prop.Area || prop.Town || prop.City || 'Costa del Sol';
  const province = prop.Province || prop.Region || 'Málaga';

  return {
    reference: prop.Reference || prop.reference || '',
    propertyType: prop.PropertyType?.Type || prop.Type || prop.PropertyType || 'Property',
    location,
    province,
    price: parseNumeric(prop.Price || prop.CurrentPrice || 0),
    priceMax: parseNumeric(prop.PriceMax || prop.PriceTo || 0),
    currency: prop.Currency || 'EUR',
    bedrooms: parseNumeric(prop.Bedrooms || prop.BedroomsFrom || 0),
    bedroomsMax: parseNumeric(prop.BedroomsMax || prop.BedroomsTo || 0),
    bathrooms: parseNumeric(prop.Bathrooms || prop.BathroomsFrom || 0),
    bathroomsMax: parseNumeric(prop.BathroomsMax || prop.BathroomsTo || 0),
    builtArea: parseNumeric(prop.Built || prop.BuiltArea || prop.BuiltM2 || 0),
    builtAreaMax: parseNumeric(prop.BuiltMax || prop.BuiltTo || 0),
    plotArea: parseNumeric(prop.Plot || prop.PlotArea || prop.PlotM2 || 0),
    plotAreaMax: parseNumeric(prop.PlotMax || prop.PlotTo || 0),
    mainImage: extractMainImage(prop),
    images: extractImages(prop),
    description: prop.Description || prop.FullDescription || prop.LongDescription || '',
    features: extractFeatures(),
    pool: prop.HasPool === 'Yes' || prop.Pool === 'Yes' || prop.CommunityPool === 'Yes',
    garden: prop.HasGarden === 'Yes' || prop.Garden === 'Yes',
    parking: prop.Parking !== undefined && prop.Parking !== 'None' && prop.Parking !== '0',
    orientation: prop.Orientation || '',
    views: prop.Views || '',
    newDevelopment: prop.NewDevelopment === 'Yes' || prop.OffPlan === 'Yes',
    status: prop.Status || 'Available',
  };
}
