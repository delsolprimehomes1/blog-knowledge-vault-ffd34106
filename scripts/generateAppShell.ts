/**
 * Generate Production App Shell
 * 
 * This script creates a production-ready app-shell.html by extracting
 * the hashed CSS/JS assets from dist/index.html and injecting them
 * into a clean shell without homepage-specific content.
 * 
 * This fixes the blank page issue where public/app-shell.html references
 * /src/main.tsx which doesn't exist in production builds.
 */

import * as fs from 'fs';
import * as path from 'path';

export function generateAppShell(distDir: string = 'dist'): void {
  const indexPath = path.join(distDir, 'index.html');
  const appShellPath = path.join(distDir, 'app-shell.html');

  // Read the built index.html to extract production assets
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ Could not find ${indexPath}`);
    return;
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Extract CSS links (modulepreload and stylesheet)
  const cssLinks: string[] = [];
  const cssRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = cssRegex.exec(indexHtml)) !== null) {
    cssLinks.push(match[0]);
  }

  // Extract modulepreload links
  const preloadLinks: string[] = [];
  const preloadRegex = /<link[^>]*rel=["']modulepreload["'][^>]*>/gi;
  while ((match = preloadRegex.exec(indexHtml)) !== null) {
    preloadLinks.push(match[0]);
  }

  // Extract the main script tag
  const scriptRegex = /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  const scripts: string[] = [];
  while ((match = scriptRegex.exec(indexHtml)) !== null) {
    scripts.push(match[0]);
  }

  // Generate clean app-shell.html with production assets
  const appShellHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#1a1a2e" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  
  <!-- Font optimization -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" /></noscript>
  
  <!-- DNS prefetch for external resources -->
  <link rel="dns-prefetch" href="https://kazggnufaoicopvmwhdl.supabase.co" />
  <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
  <link rel="dns-prefetch" href="https://images.unsplash.com" />
  
  <!-- SEO metadata will be injected by middleware -->
  
  <!-- Production CSS assets -->
  ${cssLinks.join('\n  ')}
  
  <!-- Modulepreload for performance -->
  ${preloadLinks.join('\n  ')}
</head>
<body>
  <div id="root"></div>
  
  <!-- Production JS assets -->
  ${scripts.join('\n  ')}
</body>
</html>`;

  fs.writeFileSync(appShellPath, appShellHtml);
  console.log(`✅ Generated production app-shell.html`);
  console.log(`   - CSS links: ${cssLinks.length}`);
  console.log(`   - Modulepreload links: ${preloadLinks.length}`);
  console.log(`   - Script tags: ${scripts.length}`);
}

// Run if executed directly
const distDir = process.argv[2] || 'dist';
generateAppShell(distDir);
