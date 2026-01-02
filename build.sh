#!/bin/bash
# Last deployment: 2026-01-02 10:02 - Generate static pages for new Q&As
export VITE_SUPABASE_URL="https://kazggnufaoicopvmwhdl.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"

# Build the React app
npm run build

# IMPORTANT: Generate static HOMEPAGE FIRST (replaces index.html with full SSG content)
# This must run before other static page generators to ensure bots see full content
echo "🏠 Generating static homepage (SSG)..."
npx tsx scripts/generateStaticHomePage.ts

# Generate static blog article pages
echo "📄 Generating static blog pages..."
npx tsx scripts/generateStaticPages.ts

# Generate static QA pages
echo "🔍 Generating static QA pages..."
npx tsx scripts/generateStaticQAPages.ts

# Generate static comparison pages
echo "⚖️ Generating static comparison pages..."
npx tsx scripts/generateStaticComparisonPages.ts

# Generate static location pages
echo "📍 Generating static location pages..."
npx tsx scripts/generateStaticLocationPages.ts

# Generate static about page
echo "👤 Generating static about page..."
npx tsx scripts/generateStaticAboutPage.ts

# Generate sitemap with all pages
echo "🗺️ Generating sitemap..."
npx tsx scripts/generateSitemap.ts

# Copy Cloudflare Pages Functions to dist directory
# This ensures Cloudflare Pages detects and deploys the middleware
echo "🔧 Setting up Cloudflare Pages Functions..."
if [ -d "functions" ]; then
  cp -r functions dist/functions
  echo "   ✅ Copied functions/ to dist/functions/"
else
  echo "   ⚠️ No functions/ directory found"
fi

echo "✅ Build complete with SSG!"
echo ""
echo "📋 SSG Summary:"
echo "   - Homepage: Static index.html with full H1, body, JSON-LD"
echo "   - Blog: Pre-rendered article pages"
echo "   - QA: Pre-rendered Q&A pages"
echo "   - Comparisons: Pre-rendered comparison pages"
echo "   - Locations: Pre-rendered location pages"
echo "   - About: Pre-rendered about page"