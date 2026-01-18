import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to generate static HTML pages after build
function staticPageGenerator(): Plugin {
  return {
    name: "static-page-generator",
    async closeBundle() {
      // Only run in production builds
      if (process.env.NODE_ENV === 'production') {
        console.log('\n📄 Generating static pages...');
        try {
          const { generateStaticPages } = await import('./scripts/generateStaticPages');
          await generateStaticPages(path.resolve(__dirname, 'dist'));
        } catch (err) {
          console.error('Failed to generate static pages:', err);
          // Don't fail the build if static generation fails
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
