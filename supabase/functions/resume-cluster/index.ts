import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RUNTIME = 4.5 * 60 * 1000; // 4.5 minutes
const ARTICLE_ESTIMATE = 60000; // 60 seconds per article

// ============= HELPER FUNCTIONS FROM GENERATE-CLUSTER =============

// Helper function to remove citation links from HTML for blocked domains
function removeCitationLinks(content: string, blockedCitations: any[]): string {
  let updatedContent = content;
  
  for (const blocked of blockedCitations) {
    const escapedUrl = blocked.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const citationPattern = new RegExp(
      `According to the <a[^>]*href="${escapedUrl}"[^>]*>[^<]+</a>,\\s*`,
      'gi'
    );
    
    updatedContent = updatedContent.replace(citationPattern, '');
  }
  
  return updatedContent;
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Helper function to filter citations against approved domains
async function filterCitations(
  supabase: any,
  citations: any[],
  jobId: string,
  articleNum: number,
  htmlContent?: string
): Promise<{ filtered: any[]; blocked: any[]; cleanedContent?: string }> {
  if (!citations || citations.length === 0) {
    return { filtered: citations, blocked: [], cleanedContent: htmlContent };
  }

  console.log(`[Resume ${jobId}] 🔍 Filtering ${citations.length} citations for article ${articleNum}...`);

  const { data: approvedDomains, error } = await supabase
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', true);

  if (error) {
    console.error(`[Resume ${jobId}] ❌ Error fetching approved domains:`, error);
    return { filtered: citations, blocked: [], cleanedContent: htmlContent };
  }

  const approvedSet = new Set(
    (approvedDomains || []).map((d: any) => d.domain.toLowerCase())
  );

  console.log(`[Resume ${jobId}] ✅ Loaded ${approvedSet.size} approved domains`);

  const filtered: any[] = [];
  const blocked: any[] = [];

  for (const citation of citations) {
    const domain = extractDomain(citation.url);
    
    if (approvedSet.has(domain.toLowerCase())) {
      filtered.push(citation);
    } else {
      blocked.push({ 
        domain, 
        url: citation.url, 
        source: citation.source || citation.sourceName 
      });
    }
  }

  if (blocked.length > 0) {
    console.warn(`[Resume ${jobId}] 🚫 BLOCKED ${blocked.length} competitor citations for article ${articleNum}:`);
    blocked.forEach(b => {
      console.warn(`  - ${b.domain}: ${b.url} (${b.source})`);
    });
  }

  console.log(`[Resume ${jobId}] ✅ Citation filtering complete: ${filtered.length} approved, ${blocked.length} blocked`);

  let cleanedContent = htmlContent;
  if (htmlContent && blocked.length > 0) {
    cleanedContent = removeCitationLinks(htmlContent, blocked);
    console.log(`[Resume ${jobId}] 🧹 Cleaned HTML content of ${blocked.length} blocked citation links`);
  }

  return { filtered, blocked, cleanedContent };
}

// Helper function to update job progress
async function updateProgress(supabase: any, jobId: string, step: number, message: string, articleNum?: number) {
  await supabase
    .from('cluster_generations')
    .update({
      status: 'generating',
      progress: {
        current_step: step,
        total_steps: 11,
        current_article: articleNum || 0,
        message
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Heartbeat function to indicate backend is alive
async function sendHeartbeat(supabase: any, jobId: string) {
  await supabase
    .from('cluster_generations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// Timeout wrapper for promises with proper cleanup
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutHandle: number | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(`⏱️ TIMEOUT: ${errorMessage} (${timeoutMs}ms)`);
      console.error(error.message);
      reject(error);
    }, timeoutMs) as unknown as number;
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    throw error;
  }
}

// Content quality validation
function validateContentQuality(article: any, plan: any): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 100;
  
  const headlineWords = plan.headline.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const contentLower = article.detailed_content.toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  if (plan.targetKeyword && !contentLower.includes(plan.targetKeyword.toLowerCase())) {
    issues.push('Target keyword not found in content');
    score -= 10;
  }
  
  const h2Count = (article.detailed_content.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  if (wordCount < 1200) {
    issues.push(`Content too short (${wordCount} words, minimum 1200)`);
    score -= 15;
  }
  
  return {
    isValid: score >= 60,
    issues,
    score
  };
}

// Heartbeat wrapper
async function withHeartbeat<T>(
  supabase: any,
  jobId: string,
  promise: Promise<T>,
  intervalMs: number = 30000
): Promise<T> {
  const heartbeatInterval = setInterval(async () => {
    console.log(`[Resume ${jobId}] 💓 Heartbeat - operation still in progress...`);
    await sendHeartbeat(supabase, jobId);
  }, intervalMs);
  
  try {
    return await promise;
  } finally {
    clearInterval(heartbeatInterval);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const FUNCTION_START_TIME = Date.now();
  
  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('jobId is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`[Resume ${jobId}] 🔄 Starting resume generation`);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Validate job can be resumed
    if (!job.article_structure) {
      throw new Error('Job missing article_structure - cannot resume. Please start a new generation.');
    }

    if (job.status === 'completed') {
      console.log(`[Resume ${jobId}] ✅ Job already completed`);
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          isComplete: true,
          message: 'Cluster already complete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const articleStructures = job.article_structure;
    const totalArticles = job.total_articles || 6;

    // Find which articles are already generated
    const { data: existingArticles } = await supabase
      .from('blog_articles')
      .select('id, cluster_number')
      .eq('cluster_id', jobId)
      .order('cluster_number', { ascending: true });

    const existingNumbers = new Set(existingArticles?.map(a => a.cluster_number) || []);
    const remainingIndices = Array.from({ length: totalArticles }, (_, i) => i)
      .filter(i => !existingNumbers.has(i + 1));

    console.log(`[Resume ${jobId}] 📊 Progress: ${existingNumbers.size}/${totalArticles} articles`);
    console.log(`[Resume ${jobId}] 📝 Remaining indices:`, remainingIndices);

    if (remainingIndices.length === 0) {
      // Mark as completed
      await supabase
        .from('cluster_generations')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          isComplete: true,
          totalGenerated: totalArticles,
          message: 'Cluster complete - all articles generated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to generating
    await supabase
      .from('cluster_generations')
      .update({ 
        status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Helper to check remaining time
    const remainingTime = () => MAX_RUNTIME - (Date.now() - FUNCTION_START_TIME);
    const hasTimeForAnother = () => remainingTime() > ARTICLE_ESTIMATE;

    let generatedInThisRun = 0;
    const savedArticleIds = existingArticles?.map(a => a.id) || [];

    // Process remaining articles
    for (const index of remainingIndices) {
      if (!hasTimeForAnother()) {
        console.log(`[Resume ${jobId}] ⏱️ Time limit approaching. Stopping. Generated ${generatedInThisRun} in this run.`);
        break;
      }

      const articleStructure = articleStructures[index];
      const articleStartTime = Date.now();
      console.log(`[Resume ${jobId}] 📝 Generating article ${index + 1}/${totalArticles}: ${articleStructure.headline}`);
      await updateProgress(supabase, jobId, 2 + index, `Generating article ${index + 1} of ${totalArticles}...`, index + 1);

      try {
        // Fetch necessary data (categories, authors, master prompt, LOVABLE_API_KEY)
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        const { data: authors } = await supabase
          .from('authors')
          .select('*')
          .order('years_experience', { ascending: false });
        
        const { data: masterPromptData } = await supabase
          .from('content_settings')
          .select('setting_value')
          .eq('setting_key', 'master_content_prompt')
          .single();
        
        const masterPrompt = masterPromptData?.setting_value || '';
        const hasCustomPrompt = masterPrompt && masterPrompt.length > 50;
        
        const plan = articleStructure;
        const article: any = {
          funnel_stage: plan.funnelStage,
          language: job.language,
          status: 'draft',
        };

        // 1. HEADLINE
        article.headline = plan.headline;

        // 2. SLUG
        article.slug = plan.headline
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // 3. CATEGORY (AI-based selection)
        const validCategoryNames = (categories || []).map((c: any) => c.name);
        
        const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name: any, i: number) => `${i + 1}. ${name}`).join('\n')}

Article Details:
- Headline: ${plan.headline}
- Target Keyword: ${plan.targetKeyword}
- Content Angle: ${plan.contentAngle}
- Funnel Stage: ${plan.funnelStage}

Return ONLY the category name exactly as shown above. No explanation, no JSON, just the category name.`;

        let finalCategory;
        
        try {
          const categoryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              max_tokens: 256,
              messages: [{ role: 'user', content: categoryPrompt }],
            }),
          });

          if (!categoryResponse.ok && (categoryResponse.status === 429 || categoryResponse.status === 402)) {
            throw new Error(`Lovable AI error: ${categoryResponse.status}`);
          }

          const categoryData = JSON.parse(await categoryResponse.text());
          const aiSelectedCategory = categoryData.choices[0].message.content.trim();
          
          if (validCategoryNames.includes(aiSelectedCategory)) {
            finalCategory = aiSelectedCategory;
          } else {
            finalCategory = plan.funnelStage === 'TOFU' ? 'Market Analysis' : 'Buying Guides';
          }
        } catch (error) {
          console.error(`[Resume ${jobId}] Category selection error:`, error);
          finalCategory = categories?.[0]?.name || 'Buying Guides';
        }
        
        article.category = finalCategory;

        // 4. SEO META TAGS
        const seoPrompt = `Create SEO meta tags for this article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}
Language: ${job.language}

Requirements:
- Meta Title: Include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: Compelling summary with CTA
- Max 160 characters (strict limit)

Return ONLY valid JSON:
{
  "title": "Title here (max 60 chars)",
  "description": "Description with benefits and CTA (max 160 chars)"
}`;

        const seoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 512,
            messages: [{ role: 'user', content: seoPrompt }],
          }),
        });

        const seoData = JSON.parse(await seoResponse.text());
        const seoText = seoData.choices[0].message.content;
        const seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, ''));
        
        article.meta_title = seoMeta.title;
        article.meta_description = seoMeta.description;
        article.canonical_url = null;

        // 5. SPEAKABLE ANSWER
        const speakablePrompt = `Write a 40-60 word speakable answer for this article:

Question: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${plan.contentAngle}

Requirements:
- Conversational tone
- Present tense, active voice
- Exactly 40-60 words

Return ONLY the speakable text, no JSON, no formatting.`;

        const speakableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 256,
            messages: [{ role: 'user', content: speakablePrompt }],
          }),
        });

        const speakableData = JSON.parse(await speakableResponse.text());
        article.speakable_answer = speakableData.choices[0].message.content.trim();

        // 6. DETAILED CONTENT
        console.log(`[Resume ${jobId}] Generating detailed content for article ${index + 1}`);
        
        let contentPromptMessages;
        
        if (hasCustomPrompt) {
          const processedPrompt = masterPrompt
            .replace(/\{\{headline\}\}/g, plan.headline)
            .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || job.primary_keyword)
            .replace(/\{\{searchIntent\}\}/g, plan.searchIntent || 'informational')
            .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || 'comprehensive guide')
            .replace(/\{\{funnelStage\}\}/g, plan.funnelStage)
            .replace(/\{\{targetAudience\}\}/g, job.target_audience)
            .replace(/\{\{language\}\}/g, job.language);

          contentPromptMessages = [
            {
              role: "system",
              content: "You are Hans Beeckman, an expert Costa del Sol property specialist. Follow the master prompt instructions exactly."
            },
            {
              role: "user",
              content: processedPrompt
            }
          ];
        } else {
          const contentPrompt = `Write a comprehensive 2000-word blog article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Search Intent: ${plan.searchIntent}
Content Angle: ${plan.contentAngle}
Funnel Stage: ${plan.funnelStage}
Target Audience: ${job.target_audience}
Language: ${job.language}

Requirements:
1. Structure with H2 and H3 headings
2. Include specific data points
3. Natural tone, 8th-grade reading level
4. Reference claims naturally
5. Format as HTML with proper tags

Return ONLY the HTML content.`;

          contentPromptMessages = [
            { role: 'user', content: contentPrompt }
          ];
        }

        const contentTimeout = plan.funnelStage === 'TOFU' ? 120000 : plan.funnelStage === 'MOFU' ? 150000 : 180000;
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`[Resume ${jobId}] Article ${index + 1} - Aborting after ${contentTimeout}ms`);
          abortController.abort();
        }, contentTimeout);

        let contentResponse;
        try {
          contentResponse = await withHeartbeat(
            supabase,
            jobId,
            fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 8192,
                messages: contentPromptMessages,
              }),
              signal: abortController.signal
            })
          );
          
          clearTimeout(timeoutId);
        } catch (aiError) {
          clearTimeout(timeoutId);
          throw aiError;
        }

        if (!contentResponse.ok) {
          const errorText = await contentResponse.text();
          if (contentResponse.status === 429) {
            throw new Error('Lovable AI rate limit exceeded');
          }
          if (contentResponse.status === 402) {
            throw new Error('Lovable AI credits depleted');
          }
          throw new Error(`AI API error: ${contentResponse.status}`);
        }

        const contentData = JSON.parse(await contentResponse.text());
        const detailedContent = contentData.choices[0].message.content.trim();
        article.detailed_content = detailedContent;

        // 7. FEATURED IMAGE
        const imagePrompt = `Professional Costa del Sol real estate photography:
${plan.funnelStage === 'TOFU' ? 'Inspirational lifestyle scene' : plan.funnelStage === 'MOFU' ? 'Detailed property showcase' : 'Professional consultation scene'}
Ultra-realistic, 8k resolution, ${plan.headline}`;

        try {
          const imageResponse = await supabase.functions.invoke('generate-image', {
            body: {
              prompt: imagePrompt,
              headline: plan.headline,
            },
          });

          let featuredImageUrl = '';
          let featuredImageAlt = '';

          if (imageResponse.data?.images?.[0]?.url) {
            const tempImageUrl = imageResponse.data.images[0].url;
            
            try {
              const imageBlob = await (await fetch(tempImageUrl)).blob();
              const fileName = `cluster-${jobId}-article-${index + 1}.jpg`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('article-images')
                .upload(fileName, imageBlob, {
                  contentType: 'image/jpeg',
                  upsert: true
                });

              if (uploadError) {
                featuredImageUrl = tempImageUrl;
              } else {
                const { data: publicUrlData } = supabase.storage
                  .from('article-images')
                  .getPublicUrl(fileName);
                
                featuredImageUrl = publicUrlData.publicUrl;
              }
            } catch (storageError) {
              featuredImageUrl = tempImageUrl;
            }

            const altPrompt = `Create SEO-optimized alt text for: ${plan.headline}. Include keyword "${plan.targetKeyword}". Max 125 characters.`;
            const altResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 256,
                messages: [{ role: 'user', content: altPrompt }],
              }),
            });

            const altData = JSON.parse(await altResponse.text());
            featuredImageAlt = altData.choices[0].message.content.trim();
          } else {
            featuredImageUrl = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200';
            featuredImageAlt = `${plan.headline} - Costa del Sol luxury real estate`;
          }

          article.featured_image_url = featuredImageUrl;
          article.featured_image_alt = featuredImageAlt;
          article.featured_image_caption = `${plan.headline} - Luxury real estate in Costa del Sol`;
        } catch (error) {
          console.error('[Resume] Image generation failed:', error);
          article.featured_image_url = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200';
          article.featured_image_alt = `${plan.headline} - Costa del Sol luxury real estate`;
          article.featured_image_caption = `${plan.headline} - Luxury real estate in Costa del Sol`;
        }

        // 8. DIAGRAM (for MOFU/BOFU)
        if (plan.funnelStage !== 'TOFU') {
          try {
            const diagramResponse = await withTimeout(
              supabase.functions.invoke('generate-diagram', {
                body: {
                  articleContent: article.detailed_content,
                  headline: plan.headline,
                },
              }),
              60000,
              'Diagram generation timeout'
            );

            if (diagramResponse.data?.mermaidCode) {
              article.diagram_url = diagramResponse.data.mermaidCode;
              article.diagram_description = diagramResponse.data.description;
            } else {
              article.diagram_url = null;
              article.diagram_description = null;
            }
          } catch (error) {
            console.error('Diagram generation failed:', error);
            article.diagram_url = null;
            article.diagram_description = null;
          }
        } else {
          article.diagram_url = null;
          article.diagram_description = null;
        }

        // 9. E-E-A-T ATTRIBUTION
        if (authors && authors.length > 0) {
          try {
            const authorPrompt = `Suggest E-E-A-T attribution for this article:

Headline: ${plan.headline}
Funnel Stage: ${plan.funnelStage}

Available Authors:
${authors.map((author: any, idx: number) => 
  `${idx + 1}. ${author.name} - ${author.job_title}, ${author.years_experience} years`
).join('\n')}

Return ONLY valid JSON:
{
  "primaryAuthorNumber": 1,
  "reviewerNumber": 2,
  "reasoning": "Brief reason",
  "confidence": 90
}`;

            const authorResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 512,
                messages: [{ role: 'user', content: authorPrompt }],
              }),
            });

            const authorData = JSON.parse(await authorResponse.text());
            const authorText = authorData.choices[0].message.content;
            const authorSuggestion = JSON.parse(authorText.replace(/```json\n?|\n?```/g, ''));

            const primaryAuthorIdx = authorSuggestion.primaryAuthorNumber - 1;
            const reviewerIdx = authorSuggestion.reviewerNumber - 1;

            article.author_id = authors[primaryAuthorIdx]?.id || authors[0].id;
            article.reviewer_id = (reviewerIdx >= 0 && reviewerIdx < authors.length && reviewerIdx !== primaryAuthorIdx) 
              ? authors[reviewerIdx]?.id 
              : (authors.length > 1 ? authors.find((a: any) => a.id !== article.author_id)?.id : null);
          } catch (error) {
            console.error('E-E-A-T attribution failed:', error);
            article.author_id = authors[0].id;
            article.reviewer_id = authors.length > 1 ? authors[1].id : null;
          }
        } else {
          article.author_id = null;
          article.reviewer_id = null;
        }

        // 10. CITATIONS - SKIPPED (post-generation)
        article.external_citations = [];
        article.citation_status = 'pending';
        article.citation_failure_reason = 'Citations to be added during post-generation review';

        // 11. FAQs (for MOFU/BOFU)
        if (plan.funnelStage !== 'TOFU') {
          const faqPrompt = `Generate 3-5 FAQ entities for: ${plan.headline}

Return ONLY valid JSON:
{
  "faqs": [
    {
      "question": "Question?",
      "answer": "Concise answer (2-3 sentences)"
    }
  ]
}`;

          const faqAbortController = new AbortController();
          const faqTimeoutId = setTimeout(() => faqAbortController.abort(), 45000);

          try {
            const faqResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 2048,
                messages: [{ role: 'user', content: faqPrompt }],
              }),
              signal: faqAbortController.signal
            });
            
            clearTimeout(faqTimeoutId);

            const faqData = JSON.parse(await faqResponse.text());
            const faqText = faqData.choices[0].message.content;
            const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
            article.faq_entities = faqResult.faqs;
          } catch (faqError) {
            clearTimeout(faqTimeoutId);
            console.warn(`[Resume ${jobId}] FAQ generation failed, continuing without FAQs`);
            article.faq_entities = [];
          }
        } else {
          article.faq_entities = [];
        }

        // 12. Calculate read time
        const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
        article.read_time = Math.ceil(wordCount / 200);

        // Validate quality
        const qualityCheck = validateContentQuality(article, plan);
        console.log(`[Resume ${jobId}] Quality Score: ${qualityCheck.score}/100`);

        // Initialize arrays
        article.internal_links = [];
        article.related_article_ids = [];
        article.cta_article_ids = [];
        article.translations = {};

        // SAVE ARTICLE TO DATABASE
        console.log(`[Resume ${jobId}] 💾 Saving article ${index + 1} to database...`);
        
        const { data: savedArticle, error: saveError } = await supabase
          .from('blog_articles')
          .insert([{
            headline: article.headline,
            slug: article.slug,
            category: article.category,
            funnel_stage: article.funnel_stage,
            language: article.language,
            status: 'draft',
            detailed_content: article.detailed_content,
            speakable_answer: article.speakable_answer,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            canonical_url: article.canonical_url,
            featured_image_url: article.featured_image_url,
            featured_image_alt: article.featured_image_alt,
            featured_image_caption: article.featured_image_caption || null,
            diagram_url: article.diagram_url || null,
            diagram_description: article.diagram_description || null,
            external_citations: article.external_citations || [],
            internal_links: article.internal_links || [],
            author_id: article.author_id || null,
            reviewer_id: article.reviewer_id || null,
            faq_entities: article.faq_entities || [],
            read_time: article.read_time,
            cluster_id: jobId,
            cluster_number: index + 1,
            cluster_theme: job.topic,
            related_article_ids: [],
            cta_article_ids: [],
            translations: {},
            date_published: null,
            date_modified: new Date().toISOString(),
            citation_status: article.citation_status || 'pending',
            citation_failure_reason: article.citation_failure_reason || null,
          }])
          .select()
          .single();
        
        if (saveError) {
          console.error(`[Resume ${jobId}] ❌ Failed to save article ${index + 1}:`, saveError);
          throw new Error(`Failed to save article: ${saveError.message}`);
        }
        
        savedArticleIds.push(savedArticle.id);
        generatedInThisRun++;
        
        const articleDuration = ((Date.now() - articleStartTime) / 1000).toFixed(1);
        console.log(`[Resume ${jobId}] ✅ Article ${index + 1} SAVED (ID: ${savedArticle.id}) in ${articleDuration}s`);
        
        // Update progress
        await supabase
          .from('cluster_generations')
          .update({
            articles: savedArticleIds,
            progress: {
              current_step: 2 + index,
              total_steps: 11,
              current_article: index + 1,
              total_articles: totalArticles,
              saved_articles: savedArticleIds.length,
              message: `Article ${index + 1}/${totalArticles} saved: "${article.headline}"`
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
      } catch (error) {
        console.error(`[Resume ${jobId}] ❌ Error generating article ${index + 1}:`, error);
        // Continue to next article
      }

      // Update heartbeat
      await supabase
        .from('cluster_generations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    // Determine final status
    const totalGenerated = existingNumbers.size + generatedInThisRun;
    const isComplete = totalGenerated >= totalArticles;
    const newStatus = isComplete ? 'completed' : 'partial';

    await supabase
      .from('cluster_generations')
      .update({
        status: newStatus,
        articles: savedArticleIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Resume ${jobId}] 📊 Resume complete: ${totalGenerated}/${totalArticles} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        generatedInThisRun,
        totalGenerated,
        totalTarget: totalArticles,
        isComplete,
        remaining: totalArticles - totalGenerated,
        message: isComplete 
          ? `✅ Cluster complete! All ${totalArticles} articles generated.`
          : `⚠️ Partial: ${totalGenerated}/${totalArticles} articles. Resume again to continue.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Resume cluster error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
