import * as fal from "@fal-ai/serverless-client";

interface CostaDelSolImage {
    url: string;
    title: string;
    description: string;
    alt: string;
}

export async function generateCostaDelSolImages(): Promise<CostaDelSolImage[]> {
    const imagePrompts = [
        {
            prompt: "Stunning aerial view of Costa del Sol coastline at golden hour, luxury villas on hillside overlooking turquoise Mediterranean sea, modern architecture, palm trees, pristine beaches, professional real estate photography, 8K, ultra realistic",
            title: "Coastal Paradise",
            description: "Where luxury meets the Mediterranean"
        },
        {
            prompt: "Elegant beachfront promenade in Marbella, palm-lined walkway, luxury yachts in marina, upscale restaurants with outdoor seating, golden sunset, professional photography, vibrant colors, 8K resolution",
            title: "Marbella Lifestyle",
            description: "Sophistication at every turn"
        },
        {
            prompt: "Modern luxury villa with infinity pool overlooking Costa del Sol, contemporary architecture, floor-to-ceiling windows, manicured gardens, sunset lighting, professional architectural photography, ultra HD",
            title: "Dream Villas",
            description: "Your perfect home awaits"
        },
        {
            prompt: "Picturesque white village (pueblo blanco) on hillside, traditional Spanish architecture, narrow cobblestone streets, flower-filled balconies, mountain backdrop, blue sky, professional travel photography, vivid colors",
            title: "Authentic Charm",
            description: "Rich culture and heritage"
        },
        {
            prompt: "Pristine golf course on Costa del Sol, rolling green fairways, palm trees, mountain views, Mediterranean sea in background, morning light, professional golf course photography, 8K",
            title: "World-Class Golf",
            description: "Championship courses at your doorstep"
        },
        {
            prompt: "Luxury beach club on Costa del Sol, white sand beach, turquoise water, elegant sun loungers, thatched umbrellas, people enjoying leisure, sunset ambiance, professional lifestyle photography, warm tones",
            title: "Beach Club Living",
            description: "Endless summer days"
        }
    ];

    const images: CostaDelSolImage[] = [];

    // Parallel processing for faster loading, but with individual error handling
    const promises = imagePrompts.map(async ({ prompt, title, description }) => {
        try {
            const result = await fal.subscribe("fal-ai/nano-banana-pro", {
                input: {
                    prompt: prompt,
                    aspect_ratio: "16:9",
                    resolution: "2K",
                    num_images: 1,
                    output_format: "png"
                }
            });

            if ((result as any).images && (result as any).images[0]) {
                return {
                    url: (result as any).images[0].url,
                    title,
                    description,
                    alt: `${title} - Costa del Sol luxury real estate`
                };
            }
        } catch (error) {
            console.error(`Failed to generate image: ${title}`, error);
        }

        // Fallback if generation fails
        return {
            url: `https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?q=80&w=2670&auto=format&fit=crop`, // Generic fallback
            title,
            description,
            alt: `${title} - Costa del Sol`
        };
    });

    const results = await Promise.all(promises);
    return results;
}
