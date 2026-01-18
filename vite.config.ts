import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to generate ALL static HTML pages after build
function staticPageGenerator(): Plugin {
  return {
    name: "static-page-generator",
    async closeBundle() {
      // Only run in production builds
      if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        
        // 1. Generate app-shell.html first (needed for dynamic routes)
        console.log('\n📄 Generating app-shell.html...');
        try {
          const { generateAppShell } = await import('./scripts/generateAppShell');
          if (typeof generateAppShell === 'function') {
            generateAppShell(distPath);
          }
        } catch (err) {
          console.error('Failed to generate app-shell:', err);
        }
        
        // 2. Generate static homepages (CRITICAL - prevents 404 on /)
        console.log('\n🏠 Generating static homepages...');
        try {
          const { generateStaticHomePage } = await import('./scripts/generateStaticHomePage');
          await generateStaticHomePage(distPath);
          
          // Verify home.html was created
          if (!fs.existsSync(path.join(distPath, 'home.html'))) {
            console.error('❌ CRITICAL: dist/home.html was not created!');
          } else {
            console.log('✅ dist/home.html verified');
          }
        } catch (err) {
          console.error('❌ Failed to generate static homepages:', err);
        }
        
        // 3. Generate blog article pages
        console.log('\n📄 Generating static blog pages...');
        try {
          const { generateStaticPages } = await import('./scripts/generateStaticPages');
          await generateStaticPages(distPath);
        } catch (err) {
          console.error('Failed to generate static blog pages:', err);
        }
        
        // 4. Generate Q&A pages
        console.log('\n❓ Generating static Q&A pages...');
        try {
          const { generateStaticQAPages } = await import('./scripts/generateStaticQAPages');
          await generateStaticQAPages(distPath);
        } catch (err) {
          console.error('Failed to generate Q&A pages:', err);
        }
        
        // 5. Generate comparison pages
        console.log('\n⚖️ Generating static comparison pages...');
        try {
          const { generateStaticComparisonPages } = await import('./scripts/generateStaticComparisonPages');
          await generateStaticComparisonPages(distPath);
        } catch (err) {
          console.error('Failed to generate comparison pages:', err);
        }
        
        // 6. Generate location pages
        console.log('\n📍 Generating static location pages...');
        try {
          const { generateStaticLocationPages } = await import('./scripts/generateStaticLocationPages');
          await generateStaticLocationPages(distPath);
        } catch (err) {
          console.error('Failed to generate location pages:', err);
        }
        
        // 7. Generate about page
        console.log('\n📋 Generating static about page...');
        try {
          const { generateStaticAboutPage } = await import('./scripts/generateStaticAboutPage');
          await generateStaticAboutPage(distPath);
        } catch (err) {
          console.error('Failed to generate about page:', err);
        }
      }
    }
  };
}

// Plugin to generate sitemap.xml at build time
function sitemapGenerator(): Plugin {
  return {
    name: "sitemap-generator",
    async buildStart() {
      // Generate sitemap before build so it's included in dist
      console.log('\n🗺️ Generating sitemap...');
      try {
        const { generateSitemap } = await import('./scripts/generateSitemap');
        await generateSitemap();
      } catch (err) {
        console.error('Failed to generate sitemap:', err);
        // Don't fail the build if sitemap generation fails
      }
    }
  };
}

// Plugin to copy Cloudflare Pages Functions (middleware) into the build output.
// Lovable publishes the `dist/` directory, so functions must exist inside it.
function cloudflareFunctionsCopier(): Plugin {
  return {
    name: "cloudflare-functions-copier",
    async closeBundle() {
      const srcDir = path.resolve(__dirname, 'functions');
      const destDir = path.resolve(__dirname, 'dist', 'functions');

      try {
        if (!fs.existsSync(srcDir)) return;

        // Clear existing output (if any)
        fs.rmSync(destDir, { recursive: true, force: true });

        // Node 16+ supports fs.cpSync
        fs.cpSync(srcDir, destDir, { recursive: true });
        console.log('🔧 Copied functions/ to dist/functions/ (Pages middleware enabled)');
      } catch (err) {
        console.error('Failed to copy Cloudflare functions into dist:', err);
        // Don't fail the build; the app can still serve as SPA.
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    // Clear cache with unique identifier - v2
    exclude: [],
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    sitemapGenerator(),
    staticPageGenerator(),
    cloudflareFunctionsCopier(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
