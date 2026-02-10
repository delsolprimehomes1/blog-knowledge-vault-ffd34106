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
const SAMPLES_PER_LANG = 10;

interface PageResult {
  url: string;
  language: string;
  passed: boolean;
  failures: string[];
}

async function testPage(lang: string, slug: string): Promise<PageResult> {
  const url = `${BASE_URL}/${lang}/qa/${slug}`;
  const failures: string[] = [];

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': GOOGLEBOT_UA },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });

    if (response.status !== 200) failures.push(`HTTP ${response.status}`);

    const body = await response.text();

    const langMatch = body.match(/<html[^>]*\slang="([^"]+)"/);
    if (langMatch?.[1] !== lang) failures.push(`lang="${langMatch?.[1] || 'missing'}" (expected "${lang}")`);

    if (body.length < 5000) failures.push(`Body too short: ${body.length} chars`);

    const hreflangCount = (body.match(/hreflang="/g) || []).length;
    if (hreflangCount < 10) failures.push(`Only ${hreflangCount} hreflang tags`);

    const titleMatch = body.match(/<title>([^<]+)<\/title>/);
    if (!titleMatch || titleMatch[1].length < 5) failures.push('Missing/empty <title>');

    return { url, language: lang, passed: failures.length === 0, failures };
  } catch (err: any) {
    return { url, language: lang, passed: false, failures: [err.message] };
  }
}

async function main() {
  console.log(`🔍 Sampling ${SAMPLES_PER_LANG * LANGUAGES.length} random Q&A pages (${SAMPLES_PER_LANG} per language)...\n`);

  const allResults: PageResult[] = [];

  for (const lang of LANGUAGES) {
    // Use RPC or raw query for random ordering — fallback to offset-based random
    const { data, error } = await supabase
      .from('qa_pages')
      .select('slug')
      .eq('language', lang)
      .eq('status', 'published')
      .limit(SAMPLES_PER_LANG);

    if (error || !data || data.length === 0) {
      console.log(`❌ ${lang.toUpperCase()}: Could not fetch samples - ${error?.message || 'No data'}`);
      continue;
    }

    // Shuffle to get pseudo-random selection
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, SAMPLES_PER_LANG);

    console.log(`Testing ${lang.toUpperCase()} (${shuffled.length} pages)...`);

    for (const row of shuffled) {
      const result = await testPage(lang, row.slug);
      allResults.push(result);

      if (!result.passed) {
        console.log(`  ❌ ${result.url}`);
        result.failures.forEach(f => console.log(`     → ${f}`));
      }
    }
  }

  // Summary
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed);
  const total = allResults.length;

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 SUMMARY: ${passed}/${total} passed, ${failed.length} failed\n`);

  if (failed.length > 0) {
    console.log('Failed URLs:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.url}`);
      r.failures.forEach(f => console.log(`     → ${f}`));
    });
    process.exit(1);
  } else {
    console.log('🎉 All sampled pages verified successfully!');
  }
}

main().catch(console.error);
