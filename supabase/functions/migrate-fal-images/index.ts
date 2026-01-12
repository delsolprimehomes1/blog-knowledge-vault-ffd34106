import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Upload image from Fal.ai to Supabase Storage
 */
async function uploadToStorage(
  falImageUrl: string,
  supabase: any,
  bucket: string,
  prefix: string
): Promise<{ success: boolean; newUrl: string | null; error?: string }> {
  try {
    console.log(`📥 Downloading from Fal.ai: ${falImageUrl.substring(0, 80)}...`);
    
    const imageResponse = await fetch(falImageUrl);
    if (!imageResponse.ok) {
      return { success: false, newUrl: null, error: `Download failed: ${imageResponse.status}` };
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedPrefix = prefix
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .substring(0, 50);
    const filename = `${sanitizedPrefix}-${timestamp}-${randomSuffix}.png`;
    
    console.log(`📤 Uploading to ${bucket}/${filename}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false
      });
    
    if (uploadError) {
      return { success: false, newUrl: null, error: `Upload failed: ${uploadError.message}` };
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);
    
    const supabaseUrl = publicUrlData?.publicUrl;
    
    if (supabaseUrl) {
      console.log(`✅ Uploaded: ${supabaseUrl}`);
      return { success: true, newUrl: supabaseUrl };
    }
    
    return { success: false, newUrl: null, error: 'Failed to get public URL' };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, newUrl: null, error: `Exception: ${errorMessage}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      table = 'blog_articles', 
      batch_size = 10, 
      dry_run = false,
      offset = 0 
    } = await req.json().catch(() => ({}));

    console.log(`🚀 Starting migration for ${table}, batch_size=${batch_size}, dry_run=${dry_run}, offset=${offset}`);

    // Determine bucket based on table
    const bucket = table === 'location_pages' ? 'location-images' : 'article-images';

    // Get records with Fal.ai URLs
    let query;
    if (table === 'blog_articles') {
      query = supabase
        .from('blog_articles')
        .select('id, headline, featured_image_url, slug')
        .ilike('featured_image_url', '%fal.media%')
        .range(offset, offset + batch_size - 1);
    } else if (table === 'qa_pages') {
      query = supabase
        .from('qa_pages')
        .select('id, question, featured_image_url, slug')
        .ilike('featured_image_url', '%fal.media%')
        .range(offset, offset + batch_size - 1);
    } else if (table === 'location_pages') {
      query = supabase
        .from('location_pages')
        .select('id, headline, featured_image_url, topic_slug')
        .ilike('featured_image_url', '%fal.media%')
        .range(offset, offset + batch_size - 1);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid table. Use: blog_articles, qa_pages, or location_pages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: records, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📋 Found ${records?.length || 0} records to migrate`);

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No more records to migrate',
          migrated: 0,
          failed: 0,
          hasMore: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      migrated: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    for (const record of records) {
      const rec = record as any;
      const prefix = rec.slug || rec.topic_slug || rec.headline?.substring(0, 30) || 'migrated';
      
      if (dry_run) {
        console.log(`🔍 [DRY RUN] Would migrate: ${record.id} - ${prefix}`);
        results.details.push({ id: record.id, prefix, status: 'dry_run' });
        results.migrated++;
        continue;
      }

      const uploadResult = await uploadToStorage(
        record.featured_image_url,
        supabase,
        bucket,
        prefix
      );

      if (uploadResult.success && uploadResult.newUrl) {
        // Update the database record
        const { error: updateError } = await supabase
          .from(table)
          .update({ featured_image_url: uploadResult.newUrl })
          .eq('id', record.id);

        if (updateError) {
          results.failed++;
          results.errors.push(`Update failed for ${record.id}: ${updateError.message}`);
          results.details.push({ id: record.id, status: 'update_failed', error: updateError.message });
        } else {
          results.migrated++;
          results.details.push({ 
            id: record.id, 
            status: 'success', 
            oldUrl: record.featured_image_url.substring(0, 60) + '...', 
            newUrl: uploadResult.newUrl 
          });
        }
      } else {
        results.failed++;
        results.errors.push(`Upload failed for ${record.id}: ${uploadResult.error}`);
        results.details.push({ id: record.id, status: 'upload_failed', error: uploadResult.error });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check if there are more records
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .ilike('featured_image_url', '%fal.media%');

    console.log(`✅ Migration batch complete: ${results.migrated} migrated, ${results.failed} failed, ${count} remaining`);

    return new Response(
      JSON.stringify({
        message: `Migration batch complete for ${table}`,
        ...results,
        remaining: count,
        hasMore: (count || 0) > 0,
        nextOffset: offset + batch_size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
