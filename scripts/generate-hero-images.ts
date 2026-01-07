import * as fal from "@fal-ai/serverless-client";
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

// Configure Fal.ai
fal.config({
    credentials: process.env.FAL_KEY || process.env.VITE_FAL_KEY
});

const heroImagePrompts = [
    {
        name: "luxury-coastal-living",
        prompt: "Photorealistic luxury modern villa with infinity pool overlooking the Mediterranean Sea at golden hour, Costa del Sol Spain, palm trees, pristine white architecture, azure blue water, elegant terrace with designer furniture, warm sunset lighting, professional real estate photography, ultra detailed, 8K quality, cinematic composition"
    },
    {
        name: "mediterranean-lifestyle",
        prompt: "Elegant rooftop terrace in Marbella with panoramic sea views, luxury outdoor dining setup, modern architectural details, Mediterranean garden with bougainvillea, sophisticated coastal living, golden hour lighting, professional photography, ultra high quality, cinematic"
    },
    {
        name: "golf-course-luxury",
        prompt: "Prestigious golf course on Costa del Sol with luxury villas in background, perfectly manicured greens, Mediterranean landscape, mountain backdrop, morning light, professional real estate photography, ultra detailed, premium quality, elegant composition"
    },
    {
        name: "beach-club-elegance",
        prompt: "Exclusive beach club on Costa del Sol, white sand beach, crystal clear turquoise water, elegant sun loungers, luxury umbrellas, Mediterranean paradise, summer day, professional lifestyle photography, ultra high quality, sophisticated atmosphere"
    },
    {
        name: "marina-yachts",
        prompt: "Luxury yacht marina in Puerto Banus, expensive yachts and sailboats, modern waterfront architecture, palm trees, blue sky, prestigious lifestyle, golden hour, professional photography, ultra detailed, premium real estate imagery"
    },
    {
        name: "penthouse-terrace",
        prompt: "Spectacular penthouse terrace with panoramic Mediterranean views, modern luxury furniture, infinity edge design, Costa del Sol coastline, sunset colors, sophisticated interior design, professional architectural photography, 8K quality, cinematic lighting"
    },
    {
        name: "andalusian-gardens",
        prompt: "Beautiful Andalusian gardens with traditional Spanish tiles, fountain, lush tropical plants, elegant colonial architecture, warm Mediterranean sunlight, peaceful luxury setting, professional photography, ultra detailed, premium quality"
    },
    {
        name: "coastal-promenade",
        prompt: "Elegant coastal promenade on Costa del Sol, palm tree-lined walkway, Mediterranean Sea, modern cafes and boutiques, luxury lifestyle, bright sunny day, professional travel photography, vibrant colors, ultra high quality"
    },
    {
        name: "mountain-sea-views",
        prompt: "Breathtaking panoramic view from luxury villa terrace, Mediterranean Sea and mountain landscape, Costa del Sol, infinity pool in foreground, modern architecture, golden hour lighting, professional real estate photography, cinematic composition, 8K quality"
    },
    {
        name: "luxury-interior-view",
        prompt: "Floor-to-ceiling windows with stunning Mediterranean sea view, modern luxury interior design, elegant furniture, open-plan living space, bright and airy, Costa del Sol property, professional interior photography, ultra high quality, sophisticated style"
    }
];

async function generateHeroImages() {
    console.log("🎨 Generating luxury Costa del Sol hero images...\n");

    const generatedImages: { name: string; url: string }[] = [];

    for (const { name, prompt } of heroImagePrompts) {
        console.log(`Generating: ${name}...`);

        try {
            const result: any = await fal.subscribe("fal-ai/flux-pro/v1.1", {
                input: {
                    prompt: prompt,
                    image_size: {
                        width: 1024,
                        height: 768
                    },
                    num_inference_steps: 28,
                    guidance_scale: 3.5,
                    num_images: 1,
                    enable_safety_checker: false
                },
                logs: true,
            });

            const imageUrl = result.data.images[0].url;
            generatedImages.push({ name, url: imageUrl });

            console.log(`✅ Generated: ${name}`);
            console.log(`   URL: ${imageUrl}\n`);

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`❌ Error generating ${name}:`, error);
        }
    }

    // Output all URLs for easy copying
    console.log("\n📋 All Generated Image URLs:\n");
    generatedImages.forEach(({ name, url }) => {
        console.log(`${name}:`);
        console.log(`${url}\n`);
    });

    // Save to JSON file for reference
    fs.writeFileSync(
        'hero-images.json',
        JSON.stringify(generatedImages, null, 2)
    );

    console.log("✅ Saved URLs to hero-images.json");

    return generatedImages;
}

// Run generation
generateHeroImages()
    .then(() => console.log("\n🎉 All hero images generated successfully!"))
    .catch(error => console.error("Error:", error));
