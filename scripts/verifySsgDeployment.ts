import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ValidationResult {
  slug: string;
  language: string;
  exists: boolean;
  hasSchemas: boolean;
  hasContent: boolean;
  hasMeta: boolean;
  hasHreflang: boolean;
  hasSelfHreflang: boolean;
  hasXDefault: boolean;
  hasCanonical: boolean;
  hasBlogPosting: boolean;
  hasRealEstateAgent: boolean;
  hasBreadcrumbList: boolean;
  hasFAQPage: boolean;
  hasSpeakable: boolean;
  hasEntityLinking: boolean;
  hreflangCount: number;
  hreflangDuplicates: boolean;
  hreflangSiblingsMissing: string[];
  aeoScore: number;
  errors: string[];
  warnings: string[];
}

async function verifyStaticPages(distDir: string): Promise<void> {
  console.log('🔍 Verifying SSG deployment...\n');

  // Fetch published articles with translations data
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('slug, headline, status, language, translations')
    .eq('status', 'published');

  if (error) {
    console.error('❌ Error fetching articles:', error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('⚠️  No published articles found in database');
    return;
  }

  console.log(`📊 Found ${articles.length} published articles\n`);

  const results: ValidationResult[] = [];
  let totalValid = 0;
  let totalErrors = 0;

  for (const article of articles) {
    const result: ValidationResult = {
      slug: article.slug,
      language: article.language || 'unknown',
      exists: false,
      hasSchemas: false,
      hasContent: false,
      hasMeta: false,
      hasHreflang: false,
      hasSelfHreflang: false,
      hasXDefault: false,
      hasCanonical: false,
      hasBlogPosting: false,
      hasRealEstateAgent: false,
      hasBreadcrumbList: false,
      hasFAQPage: false,
      hasSpeakable: false,
      hasEntityLinking: false,
      hreflangCount: 0,
      hreflangDuplicates: false,
      hreflangSiblingsMissing: [],
      aeoScore: 0,
      errors: [],
      warnings: [],
    };

    const htmlPath = resolve(distDir, 'blog', article.slug, 'index.html');

    // Check if file exists
    if (!existsSync(htmlPath)) {
      result.errors.push('Static HTML file not found');
      results.push(result);
      totalErrors++;
      continue;
    }

    result.exists = true;

    // Read HTML content
    const html = readFileSync(htmlPath, 'utf-8');

    // Check for JSON-LD schemas
    const schemaMatches = html.match(/<script type="application\/ld\+json">/g);
    const schemaCount = schemaMatches ? schemaMatches.length : 0;
    result.hasSchemas = schemaCount >= 3; // Minimum: BlogPosting + RealEstateAgent + BreadcrumbList
    
    if (schemaCount < 3) {
      result.errors.push(`Only ${schemaCount} schemas found (need at least 3)`);
    }

    // Extract all JSON-LD blocks
    const schemaBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    const schemas = schemaBlocks.map(block => {
      try {
        const json = block.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
        return JSON.parse(json);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Check for BlogPosting
    result.hasBlogPosting = schemas.some(s => s['@type'] === 'BlogPosting');
    if (!result.hasBlogPosting) {
      result.errors.push('Missing BlogPosting schema');
    }

    // Check for RealEstateAgent (Organization)
    result.hasRealEstateAgent = schemas.some(s => s['@type'] === 'RealEstateAgent');
    if (!result.hasRealEstateAgent) {
      result.errors.push('Missing RealEstateAgent schema');
    }

    // Check for BreadcrumbList
    result.hasBreadcrumbList = schemas.some(s => s['@type'] === 'BreadcrumbList');
    if (!result.hasBreadcrumbList) {
      result.warnings.push('Missing BreadcrumbList schema');
    }

    // Check for FAQPage
    result.hasFAQPage = schemas.some(s => s['@type'] === 'FAQPage');
    if (!result.hasFAQPage) {
      result.warnings.push('Missing FAQPage schema (recommended for AEO)');
    }

    // Check for SpeakableSpecification
    result.hasSpeakable = schemas.some(s => s['@type'] === 'SpeakableSpecification');
    if (!result.hasSpeakable) {
      result.warnings.push('Missing SpeakableSpecification schema (recommended for voice)');
    }

    // Validate entity linking (@id references)
    const orgSchema = schemas.find(s => s['@type'] === 'RealEstateAgent');
    const articleSchema = schemas.find(s => s['@type'] === 'BlogPosting');
    
    let entityLinkingIssues = 0;

    if (orgSchema && !orgSchema['@id']) {
      result.warnings.push('RealEstateAgent missing @id');
      entityLinkingIssues++;
    }

    if (articleSchema) {
      if (!articleSchema['@id']) {
        result.warnings.push('BlogPosting missing @id');
        entityLinkingIssues++;
      }
      
      if (!articleSchema.publisher || !articleSchema.publisher['@id']) {
        result.warnings.push('BlogPosting publisher missing @id reference');
        entityLinkingIssues++;
      }
      
      if (!articleSchema.author || !articleSchema.author['@id']) {
        result.warnings.push('BlogPosting author missing @id reference');
        entityLinkingIssues++;
      }
    }

    result.hasEntityLinking = entityLinkingIssues === 0;

    // Validate speakable content exists if schema present
    if (result.hasSpeakable) {
      const hasSpeakableContent = html.includes('class="speakable-answer"') || 
                                  html.includes('class="article-intro"');
      if (!hasSpeakableContent) {
        result.warnings.push('SpeakableSpecification present but no .speakable-answer or .article-intro in HTML');
      }
    }

    // Check for article content
    const contentMatch = html.match(/<article[^>]*class="[^"]*article-content[^"]*"[^>]*>/);
    result.hasContent = !!contentMatch;
    if (!result.hasContent) {
      result.errors.push('Article content not found in HTML');
    }

    // Verify content is not just empty div
    if (result.hasContent) {
      const contentSection = html.substring(html.indexOf('<article'));
      const hasText = contentSection.length > 500; // At least 500 chars of content
      if (!hasText) {
        result.errors.push('Article content appears empty');
        result.hasContent = false;
      }
    }

    // Check for meta tags
    const hasTitleTag = html.includes('<title>') && !html.includes('<title>Vite');
    const hasMetaDescription = html.includes('<meta name="description"');
    const hasOgTags = html.includes('<meta property="og:title"');
    const hasTwitterCard = html.includes('<meta name="twitter:card"');

    result.hasMeta = hasTitleTag && hasMetaDescription && hasOgTags && hasTwitterCard;
    if (!hasTitleTag) result.errors.push('Missing or invalid title tag');
    if (!hasMetaDescription) result.errors.push('Missing meta description');
    if (!hasOgTags) result.warnings.push('Missing Open Graph tags');
    if (!hasTwitterCard) result.warnings.push('Missing Twitter Card tags');

    // Enhanced hreflang validation
    const hreflangMatches = html.match(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/?>/g);
    result.hasHreflang = !!(hreflangMatches && hreflangMatches.length > 0);
    result.hreflangCount = hreflangMatches ? hreflangMatches.length : 0;
    
    if (result.hasHreflang) {
      // Extract hreflang codes and URLs
      const hreflangData = hreflangMatches!.map(match => {
        const codeMatch = match.match(/hreflang="([^"]+)"/);
        const urlMatch = match.match(/href="([^"]+)"/);
        return { code: codeMatch?.[1], url: urlMatch?.[1] };
      });

      // Language mapping for validation
      const langToHreflang: Record<string, string> = {
        en: 'en-GB', de: 'de-DE', nl: 'nl-NL', fr: 'fr-FR', 
        pl: 'pl-PL', sv: 'sv-SE', da: 'da-DK', hu: 'hu-HU',
        fi: 'fi-FI', no: 'nb-NO'
      };

      const expectedSelfLang = langToHreflang[article.language] || article.language;
      const currentUrl = `https://delsolprimehomes.com/blog/${article.slug}`;

      // Check self-referencing hreflang
      result.hasSelfHreflang = hreflangData.some(h => 
        h.code === expectedSelfLang && h.url === currentUrl
      );
      if (!result.hasSelfHreflang) {
        result.errors.push(`Missing self-referencing hreflang="${expectedSelfLang}" for current page`);
      }

      // Check x-default
      result.hasXDefault = hreflangData.some(h => h.code === 'x-default');
      if (!result.hasXDefault) {
        result.errors.push('Missing hreflang="x-default" tag');
      }

      // Check for duplicates
      const hreflangCodes = hreflangData.map(h => h.code);
      const uniqueCodes = new Set(hreflangCodes);
      result.hreflangDuplicates = hreflangCodes.length !== uniqueCodes.size;
      if (result.hreflangDuplicates) {
        result.errors.push('Duplicate hreflang tags detected');
      }

      // Validate sibling translations
      if (article.translations && typeof article.translations === 'object') {
        const translationLangs = Object.keys(article.translations);
        const hreflangLangs = hreflangData
          .filter(h => h.code !== 'x-default')
          .map(h => {
            // Map back from hreflang to language code
            const reverseMap: Record<string, string> = {
              'en-GB': 'en', 'de-DE': 'de', 'nl-NL': 'nl', 'fr-FR': 'fr',
              'pl-PL': 'pl', 'sv-SE': 'sv', 'da-DK': 'da', 'hu-HU': 'hu',
              'fi-FI': 'fi', 'nb-NO': 'no'
            };
            return reverseMap[h.code!] || h.code;
          });

        result.hreflangSiblingsMissing = translationLangs.filter(
          lang => !hreflangLangs.includes(lang) && lang !== article.language
        );
        
        if (result.hreflangSiblingsMissing.length > 0) {
          result.warnings.push(
            `Missing hreflang for translations: ${result.hreflangSiblingsMissing.join(', ')}`
          );
        }
      }
    } else {
      result.warnings.push('No hreflang tags found');
    }

    // Check for canonical URL
    result.hasCanonical = html.includes('<link rel="canonical"');
    if (!result.hasCanonical) {
      result.errors.push('Missing canonical URL');
    } else {
      // Validate canonical URL matches expected format
      const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
      if (canonicalMatch) {
        const canonicalUrl = canonicalMatch[1];
        const expectedCanonical = `https://delsolprimehomes.com/blog/${article.slug}`;
        if (canonicalUrl !== expectedCanonical) {
          result.warnings.push(`Canonical URL mismatch: expected ${expectedCanonical}, got ${canonicalUrl}`);
        }
      }
    }

    // Calculate AEO Readiness Score (0-100)
    let score = 0;
    
    // Schema completeness (35 points)
    if (result.hasBlogPosting) score += 10;
    if (result.hasRealEstateAgent) score += 10;
    if (result.hasBreadcrumbList) score += 7;
    if (result.hasFAQPage) score += 5;
    if (result.hasSpeakable) score += 3;
    
    // Entity linking (25 points)
    if (result.hasEntityLinking) score += 25;
    
    // Meta tags (15 points)
    if (result.hasMeta) score += 15;
    
    // Content structure (10 points)
    if (result.hasContent) score += 5;
    if (result.hasCanonical) score += 5;
    
    // Hreflang/i18n (15 points)
    if (result.hasSelfHreflang) score += 5;
    if (result.hasXDefault) score += 5;
    if (result.hasHreflang && !result.hreflangDuplicates) score += 5;
    
    result.aeoScore = Math.round(score);

    // Determine if valid
    const isValid = result.exists && 
                   result.hasSchemas && 
                   result.hasContent && 
                   result.hasMeta && 
                   result.hasCanonical &&
                   result.hasBlogPosting &&
                   result.hasRealEstateAgent &&
                   result.errors.length === 0;

    if (isValid) {
      totalValid++;
    } else {
      totalErrors++;
    }

    results.push(result);
  }

  // Print results
  console.log('━'.repeat(80));
  console.log('📊 VERIFICATION RESULTS\n');

  // Summary
  console.log(`✅ Valid static pages: ${totalValid}/${articles.length}`);
  console.log(`❌ Invalid/missing pages: ${totalErrors}/${articles.length}`);
  console.log(`📈 Success rate: ${Math.round((totalValid / articles.length) * 100)}%`);
  
  // Calculate average AEO score
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.aeoScore, 0) / results.length);
  console.log(`🎯 Average AEO Readiness Score: ${avgScore}/100\n`);

  // Schema breakdown
  const blogPostingCount = results.filter(r => r.hasBlogPosting).length;
  const realEstateAgentCount = results.filter(r => r.hasRealEstateAgent).length;
  const breadcrumbCount = results.filter(r => r.hasBreadcrumbList).length;
  const faqCount = results.filter(r => r.hasFAQPage).length;
  const speakableCount = results.filter(r => r.hasSpeakable).length;
  const entityLinkingCount = results.filter(r => r.hasEntityLinking).length;

  console.log('📋 Schema Validation:');
  console.log(`   ✅ BlogPosting: ${blogPostingCount}/${articles.length}`);
  console.log(`   ✅ RealEstateAgent: ${realEstateAgentCount}/${articles.length}`);
  console.log(`   ✅ BreadcrumbList: ${breadcrumbCount}/${articles.length}`);
  console.log(`   ${faqCount === articles.length ? '✅' : '⚠️ '} FAQPage: ${faqCount}/${articles.length}`);
  console.log(`   ${speakableCount === articles.length ? '✅' : '⚠️ '} SpeakableSpecification: ${speakableCount}/${articles.length}`);
  console.log(`   ${entityLinkingCount === articles.length ? '✅' : '⚠️ '} Entity Linking (@id): ${entityLinkingCount}/${articles.length}\n`);

  // Detailed results
  if (totalErrors > 0 || results.some(r => r.warnings.length > 0)) {
    console.log('━'.repeat(80));
    console.log('📝 DETAILED RESULTS:\n');

    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0 || result.aeoScore < 80) {
        console.log(`\n📄 ${result.slug} [${result.language.toUpperCase()}]`);
        console.log(`   AEO Score: ${result.aeoScore}/100 ${result.aeoScore >= 90 ? '🌟' : result.aeoScore >= 80 ? '✅' : result.aeoScore >= 60 ? '⚠️' : '❌'}`);
        console.log(`   File exists: ${result.exists ? '✅' : '❌'}`);
        console.log(`   BlogPosting: ${result.hasBlogPosting ? '✅' : '❌'}`);
        console.log(`   RealEstateAgent: ${result.hasRealEstateAgent ? '✅' : '❌'}`);
        console.log(`   BreadcrumbList: ${result.hasBreadcrumbList ? '✅' : '⚠️ '}`);
        console.log(`   FAQPage: ${result.hasFAQPage ? '✅' : '⚠️ '}`);
        console.log(`   Speakable: ${result.hasSpeakable ? '✅' : '⚠️ '}`);
        console.log(`   Entity Linking: ${result.hasEntityLinking ? '✅' : '⚠️ '}`);
        console.log(`   Content: ${result.hasContent ? '✅' : '❌'}`);
        console.log(`   Meta tags: ${result.hasMeta ? '✅' : '❌'}`);
        console.log(`   Canonical: ${result.hasCanonical ? '✅' : '❌'}`);
        console.log(`   Hreflang total: ${result.hreflangCount} tags`);
        console.log(`   Self-ref hreflang: ${result.hasSelfHreflang ? '✅' : '❌'}`);
        console.log(`   x-default: ${result.hasXDefault ? '✅' : '❌'}`);
        console.log(`   Duplicates: ${result.hreflangDuplicates ? '❌' : '✅'}`);
        if (result.hreflangSiblingsMissing.length > 0) {
          console.log(`   Missing siblings: ${result.hreflangSiblingsMissing.join(', ')}`);
        }

        if (result.errors.length > 0) {
          console.log(`   🔴 Errors:`);
          result.errors.forEach(err => console.log(`      - ${err}`));
        }

        if (result.warnings.length > 0) {
          console.log(`   🟡 Warnings:`);
          result.warnings.forEach(warn => console.log(`      - ${warn}`));
        }
      }
    }
  } else {
    console.log('✨ All articles have valid static pages with optimal schemas!');
  }

  console.log('\n' + '━'.repeat(80));

  // Hreflang validation summary
  const selfHreflangCount = results.filter(r => r.hasSelfHreflang).length;
  const xDefaultCount = results.filter(r => r.hasXDefault).length;
  const noDuplicatesCount = results.filter(r => !r.hreflangDuplicates).length;
  const allSiblingsCount = results.filter(r => r.hreflangSiblingsMissing.length === 0).length;

  console.log('\n🌐 HREFLANG VALIDATION:');
  console.log(`   ✅ Self-referencing hreflang: ${selfHreflangCount}/${articles.length}`);
  console.log(`   ✅ x-default present: ${xDefaultCount}/${articles.length}`);
  console.log(`   ✅ No duplicates: ${noDuplicatesCount}/${articles.length}`);
  console.log(`   ✅ All siblings linked: ${allSiblingsCount}/${articles.length}`);

  // AEO readiness summary
  const excellentCount = results.filter(r => r.aeoScore >= 90).length;
  const goodCount = results.filter(r => r.aeoScore >= 80 && r.aeoScore < 90).length;
  const fairCount = results.filter(r => r.aeoScore >= 60 && r.aeoScore < 80).length;
  const poorCount = results.filter(r => r.aeoScore < 60).length;

  console.log('\n🎯 AEO READINESS BREAKDOWN:');
  console.log(`   🌟 Excellent (90-100): ${excellentCount}`);
  console.log(`   ✅ Good (80-89): ${goodCount}`);
  console.log(`   ⚠️  Fair (60-79): ${fairCount}`);
  console.log(`   ❌ Poor (<60): ${poorCount}`);

  // Exit with error code if any failures
  if (totalErrors > 0) {
    console.log('\n⚠️  Critical errors found. Fix issues above before deploying.\n');
    process.exit(1);
  } else if (avgScore < 80) {
    console.log('\n⚠️  AEO score below 80. Consider adding FAQPage and improving entity linking.\n');
    console.log('💡 Tip: Add FAQ sections and ensure all schemas have @id references.\n');
  } else {
    console.log('\n✅ SSG deployment verified successfully!\n');
    console.log('🚀 Ready for production deployment.\n');
  }
}

// Run verification
const distDir = resolve(process.cwd(), 'dist');
verifyStaticPages(distDir).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
