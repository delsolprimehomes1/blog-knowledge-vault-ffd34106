import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kazggnufaoicopvmwhdl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-client-info': 'static-build' } }
});

const BASE_URL = 'https://www.delsolprimehomes.com';
const LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

interface TestResult {
  language: string;
  slug: string;
  url: string;
  passed: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
}

async function testLanguage(lang: string): Promise<TestResult> {
  // Get one published Q&A slug for this language
  const { data, error } = await supabase
    .from('qa_pages')
    .select('slug, language')
    .eq('language', lang)
    .eq('status', 'published')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      language: lang,
      slug: 'N/A',
      url: 'N/A',
      passed: false,
      checks: [{ name: 'Database query', passed: false, detail: error?.message || 'No published Q&A found' }]
    };
  }

  const url = `${BASE_URL}/${lang}/qa/${data.slug}`;
  const checks: { name: string; passed: boolean; detail?: string }[] = [];

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': GOOGLEBOT_UA },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });

    const body = await response.text();

    // Check 1: HTTP 200
    checks.push({
      name: 'HTTP 200',
      passed: response.status === 200,
      detail: `Status: ${response.status}`
    });

    // Check 2: Correct lang attribute
    const langMatch = body.match(/<html[^>]*\slang="([^"]+)"/);
    const detectedLang = langMatch?.[1] || 'none';
    checks.push({
      name: `lang="${lang}"`,
      passed: detectedLang === lang,
      detail: `Found: lang="${detectedLang}"`
    });

    // Check 3: X-SEO-Source header
    const seoSource = response.headers.get('x-seo-source') || response.headers.get('X-SEO-Source');
    checks.push({
      name: 'X-SEO-Source header',
      passed: !!seoSource,
      detail: seoSource || 'Missing'
    });

    // Check 4: Body length > 5000
    checks.push({
      name: 'Body > 5000 chars',
      passed: body.length > 5000,
      detail: `${body.length} chars`
    });

    // Check 5: All 10 hreflang tags
    const hreflangCount = (body.match(/hreflang="/g) || []).length;
    checks.push({
      name: '10+ hreflang tags',
      passed: hreflangCount >= 10,
      detail: `Found ${hreflangCount} hreflang tags`
    });

    // Check 6: Title tag present
    const titleMatch = body.match(/<title>([^<]+)<\/title>/);
    checks.push({
      name: '<title> present',
      passed: !!titleMatch && titleMatch[1].length > 5,
      detail: titleMatch ? titleMatch[1].substring(0, 60) : 'Missing'
    });

    return {
      language: lang,
      slug: data.slug,
      url,
      passed: checks.every(c => c.passed),
      checks
    };
  } catch (err: any) {
    checks.push({ name: 'Fetch', passed: false, detail: err.message });
    return { language: lang, slug: data.slug, url, passed: false, checks };
  }
}

async function main() {
  console.log('🔍 Testing Q&A pages across all 10 languages...\n');
  console.log(`Target: ${BASE_URL}\n`);

  const results: TestResult[] = [];

  for (const lang of LANGUAGES) {
    const result = await testLanguage(lang);
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${lang.toUpperCase()} - ${result.passed ? 'PASS' : 'FAIL'}`);

    for (const check of result.checks) {
      const ci = check.passed ? '  ✓' : '  ✗';
      console.log(`${ci} ${check.name}: ${check.detail || ''}`);
    }
    console.log(`  URL: ${result.url}\n`);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log('═'.repeat(60));
  console.log(`\n📊 SUMMARY: ${passed}/${total} languages passed\n`);

  if (passed < total) {
    console.log('Failed languages:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.language.toUpperCase()}: ${r.checks.filter(c => !c.passed).map(c => c.name).join(', ')}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All languages verified successfully!');
  }
}

main().catch(console.error);
