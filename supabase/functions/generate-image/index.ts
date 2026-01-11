import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as fal from "npm:@fal-ai/serverless-client";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

interface FalResult {
  images: FalImage[];
}

// Helper function to infer property type from headline
const inferPropertyType = (headline: string): string => {
  const text = headline.toLowerCase();
  if (text.includes('villa')) return 'luxury Spanish villa';
  if (text.includes('apartment') || text.includes('flat')) return 'modern apartment';
  if (text.includes('penthouse')) return 'penthouse with terrace';
  if (text.includes('townhouse')) return 'townhouse';
  return 'luxury property';
};

// Helper function to detect article topic
const detectArticleTopic = (headline: string): string => {
  const text = headline.toLowerCase();
  
  // Market analysis / trends / forecasts
  if (text.match(/\b(market|trends|forecast|outlook|analysis|statistics|data|report|2025|2026|predictions)\b/)) {
    return 'market-analysis';
  }
  
  // Digital nomads / remote work
  if (text.match(/\b(digital nomad|remote work|coworking|work from home|expat tech|freelance)\b/)) {
    return 'digital-nomad';
  }
  
  // Buying guides / how-to
  if (text.match(/\b(guide to|how to|step by step|buying guide|beginner|starter)\b/)) {
    return 'buying-guide';
  }
  
  // Legal/Process articles
  if (text.match(/\b(buy|buying|purchase|process|legal|documents?|nie|tax|fees?|cost|steps?)\b/)) {
    return 'process-legal';
  }
  
  // Comparison articles
  if (text.match(/\b(vs|versus|compare|comparison|best|choose|which|difference|beyond)\b/)) {
    return 'comparison';
  }
  
  // Investment articles
  if (text.match(/\b(invest|investment|roi|rental|yield|return|profit|market|portfolio|strategy)\b/)) {
    return 'investment';
  }
  
  // Lifestyle articles
  if (text.match(/\b(live|living|lifestyle|expat|retire|retirement|community|culture|quality of life)\b/)) {
    return 'lifestyle';
  }
  
  // Area/location guides
  if (text.match(/\b(guide|area|neighborhood|district|zone|where|location|hidden gem|discover)\b/)) {
    return 'location-guide';
  }
  
  // Property management / rental
  if (text.match(/\b(property management|tenant|vacation rental|maintenance|landlord)\b/)) {
    return 'property-management';
  }
  
  // Property type specific
  if (text.match(/\b(villa|apartment|penthouse|townhouse|second home)\b/)) {
    return 'property-showcase';
  }
  
  // Default
  return 'general-property';
};

// Helper function to infer location from headline
const inferLocation = (headline: string): string => {
  const text = headline.toLowerCase();
  if (text.includes('marbella')) return 'Marbella';
  if (text.includes('estepona')) return 'Estepona';
  if (text.includes('malaga') || text.includes('málaga')) return 'Málaga';
  if (text.includes('mijas')) return 'Mijas';
  if (text.includes('benalmádena') || text.includes('benalmadena')) return 'Benalmádena';
  return 'Costa del Sol';
};

// Generate contextual image prompt based on article topic
const generateContextualImagePrompt = (
  headline: string,
  topic: string,
  propertyType: string,
  location: string
): string => {
  
  const baseQuality = 'ultra-realistic, 8k resolution, professional photography, no text, no watermarks';
  
  // Time variety (rotate to avoid repetition)
  const timeOfDay = ['morning golden light', 'bright midday sun', 'soft afternoon light', 'blue hour evening'][Math.floor(Math.random() * 4)];
  
  // Architectural style variety
  const archStyles = ['modern minimalist', 'traditional Mediterranean', 'contemporary coastal', 'Spanish colonial'];
  const archStyle = archStyles[Math.floor(Math.random() * archStyles.length)];
  
  // Market analysis articles
  if (topic === 'market-analysis') {
    return `Professional business scene in modern ${location} office: 
      Real estate market analysts reviewing data and trends, 
      large display screens showing graphs and statistics, 
      Costa del Sol skyline visible through office windows, 
      business professionals in meeting, contemporary workspace, 
      laptops and digital presentations, ${timeOfDay}, 
      focus on DATA and BUSINESS not properties, 
      ${baseQuality}`;
  }
  
  // Digital nomad articles
  if (topic === 'digital-nomad') {
    return `Modern coworking lifestyle in ${location}, Costa del Sol: 
      Young remote workers in bright coworking space, 
      laptops and coffee, minimalist design, 
      Mediterranean views from windows, natural plants, 
      professional yet relaxed atmosphere, diverse professionals, 
      ${timeOfDay}, NOT luxury villas, focus on WORK lifestyle, 
      ${baseQuality}`;
  }
  
  // Lifestyle articles
  if (topic === 'lifestyle') {
    return `Authentic lifestyle photography in ${location}, Costa del Sol: 
      International expats enjoying local Spanish life, 
      outdoor market or plaza scene, palm trees, 
      café culture, community interaction, 
      NO properties visible, focus on PEOPLE and CULTURE, 
      ${timeOfDay}, documentary style, 
      ${baseQuality}`;
  }
  
  // Location guide articles
  if (topic === 'location-guide') {
    return `Aerial drone photography of ${location}, Costa del Sol: 
      Panoramic town view showing character and layout, 
      Mediterranean coastline and beaches, 
      mountains in background, urban planning visible, 
      ${timeOfDay}, NOT focusing on specific properties, 
      wide establishing shot of the area, 
      ${baseQuality}`;
  }
  
  // Comparison articles
  if (topic === 'comparison') {
    return `Conceptual split-screen comparison imagery for ${location}: 
      Two distinct Costa del Sol locations side by side, 
      contrasting environments and atmospheres, 
      beach town vs mountain town, or urban vs rural, 
      clean graphic composition, ${timeOfDay}, 
      NOT property interiors, focus on LOCATION character, 
      ${baseQuality}`;
  }
  
  // Buying guide articles
  if (topic === 'buying-guide') {
    return `Property viewing experience in ${location}: 
      Real estate agent showing ${archStyle} ${propertyType} to international buyers, 
      clients examining property features, viewing interior spaces, 
      professional consultation in progress, ${timeOfDay}, 
      NOT staged perfection, show REAL viewing experience, 
      ${baseQuality}`;
  }
  
  // Legal/process articles
  if (topic === 'process-legal') {
    return `Professional legal consultation in ${location} law office: 
      Spanish property lawyer meeting with international clients, 
      legal documents for Costa del Sol real estate on desk, 
      professional office setting, contracts and paperwork, 
      ${timeOfDay} office lighting, trust and expertise conveyed, 
      NOT properties, show LEGAL process, 
      ${baseQuality}`;
  }
  
  // Investment articles
  if (topic === 'investment') {
    return `Investment property showcase in ${location}: 
      High-yield rental ${propertyType} with modern appeal, 
      ${archStyle} design, professional staging, 
      rental-ready condition, ${timeOfDay}, 
      NOT infinity pools, focus on RENTAL potential features, 
      ${baseQuality}`;
  }
  
  // Property management
  if (topic === 'property-management') {
    return `Property management service in ${location}: 
      Professional property manager inspecting ${propertyType}, 
      maintenance checklist, tenant interaction, 
      property care and management activities, 
      ${timeOfDay}, NOT luxury glamour shots, show SERVICE aspect, 
      ${baseQuality}`;
  }
  
  // Property showcase
  if (topic === 'property-showcase') {
    return `${archStyle} ${propertyType} detailed tour in ${location}: 
      Multiple rooms and spaces, architectural details, 
      living areas and bedrooms, kitchen and bathrooms, 
      ${timeOfDay} through windows, 
      NOT only exterior pools, show INTERIOR spaces, 
      ${baseQuality}`;
  }
  
  // Default: varied general property imagery
  const defaultVariations = [
    `${archStyle} ${propertyType} interior in ${location}, Costa del Sol: Spacious living room with ${timeOfDay} natural light, contemporary furnishings, high-end finishes, terrace access visible, Spanish design elements, NOT pool-centric, focus on LIVING spaces, ${baseQuality}`,
    `Coastal lifestyle in ${location}, Costa del Sol: Beach promenade with palm trees, people walking, Mediterranean sea, ${timeOfDay}, NOT infinity pools, ${baseQuality}`,
    `${location} town center: Charming Spanish plaza, traditional architecture, outdoor dining, local atmosphere, ${timeOfDay}, NO villas, ${baseQuality}`
  ];
  return defaultVariations[Math.floor(Math.random() * defaultVariations.length)];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, headline, imageUrl } = await req.json();
    
    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    // Trim and validate FAL_KEY to prevent ByteString errors
    const cleanedFalKey = falKey.trim().replace(/[\r\n]/g, '');
    if (!cleanedFalKey || cleanedFalKey.length < 10) {
      throw new Error('FAL_KEY appears to be invalid or corrupted');
    }

    console.log('============ FAL.ai Configuration ============');
    console.log('FAL_KEY exists:', !!falKey);
    console.log('FAL_KEY length:', cleanedFalKey.length);
    console.log('FAL_KEY first 10 chars:', cleanedFalKey.substring(0, 10) + '...');
    console.log('Prompt provided:', !!prompt);
    console.log('Headline provided:', !!headline);
    console.log('Image URL provided:', !!imageUrl);
    console.log('=============================================');

    fal.config({
      credentials: cleanedFalKey
    });

    // Generate contextual prompt based on headline if custom prompt not provided
    let finalPrompt: string;
    if (prompt) {
      // User provided custom prompt - use it directly
      finalPrompt = prompt;
      console.log('Using custom user prompt');
    } else if (headline) {
      // Generate contextual prompt based on article headline
      const propertyType = inferPropertyType(headline);
      const location = inferLocation(headline);
      const articleTopic = detectArticleTopic(headline);
      
      finalPrompt = generateContextualImagePrompt(
        headline,
        articleTopic,
        propertyType,
        location
      );
      
      console.log('Generated contextual prompt for topic:', articleTopic);
    } else {
      // Fallback if neither prompt nor headline provided
      finalPrompt = `Professional Costa del Sol real estate photography, Mediterranean architecture, bright natural lighting, ultra-realistic, 8k resolution, no text, no watermarks`;
      console.log('Using fallback prompt');
    }

    console.log('Final image prompt:', finalPrompt);

    let result: FalResult;

    if (imageUrl) {
      // Editing mode - use nano-banana-pro/edit with contextual prompt
      console.log('Editing existing image:', imageUrl);
      result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
        input: {
          prompt: finalPrompt,
          aspect_ratio: "16:9",
          resolution: "2K",
          num_images: 1,
          image_urls: [imageUrl],
          output_format: "png"
        },
        logs: true,
      }) as FalResult;
    } else {
      // Generation mode - use nano-banana-pro with contextual prompt
      console.log('Generating new image with Nano Banana Pro');
      result = await fal.subscribe("fal-ai/nano-banana-pro", {
        input: {
          prompt: finalPrompt,
          aspect_ratio: "16:9",
          resolution: "2K",
          num_images: 1,
          output_format: "png"
        },
        logs: true,
      }) as FalResult;
    }

    return new Response(
      JSON.stringify({ 
        images: result.images,
        prompt: finalPrompt 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
