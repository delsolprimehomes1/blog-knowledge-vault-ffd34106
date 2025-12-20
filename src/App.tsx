import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/i18n";
import { ScrollToTop } from "@/components/ScrollToTop";

// Eager load critical pages (landing pages)
import Home from "./pages/Home";
import BlogIndex from "./pages/BlogIndex";
import QAIndex from "./pages/QAIndex";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load heavy public pages
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const QAPage = lazy(() => import("./pages/QAPage"));
const PropertyFinder = lazy(() => import("./pages/PropertyFinder"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const CityBrochure = lazy(() => import("./pages/CityBrochure"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const Glossary = lazy(() => import("./pages/Glossary"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const ComparisonIndex = lazy(() => import("./pages/ComparisonIndex"));
const LocationHub = lazy(() => import("./pages/LocationHub"));
const LocationIndex = lazy(() => import("./pages/LocationIndex"));
const LocationPage = lazy(() => import("./pages/LocationPage"));

// Lazy load ALL admin pages (rarely accessed, heavy components)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Articles = lazy(() => import("./pages/admin/Articles"));
const ArticleEditor = lazy(() => import("./pages/admin/ArticleEditor"));
const Authors = lazy(() => import("./pages/admin/Authors"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Export = lazy(() => import("./pages/admin/Export"));
const AITools = lazy(() => import("./pages/admin/AITools"));
const SystemCheck = lazy(() => import("./pages/admin/SystemCheck"));
const ClusterGenerator = lazy(() => import("./pages/admin/ClusterGenerator"));
const AEOGuide = lazy(() => import("./pages/admin/AEOGuide"));
const BatchImageGeneration = lazy(() => import("./pages/admin/BatchImageGeneration"));
const CitationHealth = lazy(() => import("./pages/admin/CitationHealth"));
const ApprovedDomains = lazy(() => import("./pages/admin/ApprovedDomains"));
const BulkInternalLinks = lazy(() => import("./pages/admin/BulkInternalLinks"));
const BulkSpeakableRegeneration = lazy(() => import("./pages/admin/BulkSpeakableRegeneration"));
const BulkArticleLinker = lazy(() => import("./pages/admin/BulkArticleLinker"));
const BrochureManager = lazy(() => import("./pages/admin/BrochureManager"));
const QAGenerator = lazy(() => import("./pages/admin/QAGenerator"));
const ComparisonGenerator = lazy(() => import("./pages/admin/ComparisonGenerator"));
const LocationGenerator = lazy(() => import("./pages/admin/LocationGenerator"));
const LocationPages = lazy(() => import("./pages/admin/LocationPages"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Eager-loaded critical pages */}
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/qa" element={<QAIndex />} />
              
              {/* Lazy-loaded public pages */}
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="/property-finder" element={<PropertyFinder />} />
              <Route path="/property/:reference" element={<PropertyDetail />} />
              <Route path="/brochure/:citySlug" element={<CityBrochure />} />
              <Route path="/qa/:slug" element={<QAPage />} />
              <Route path="/compare" element={<ComparisonIndex />} />
              <Route path="/compare/:slug" element={<ComparisonPage />} />
              <Route path="/locations" element={<LocationHub />} />
              <Route path="/locations/:citySlug" element={<LocationIndex />} />
              <Route path="/locations/:citySlug/:topicSlug" element={<LocationPage />} />
              
              {/* Protected Admin Routes - All lazy loaded */}
              <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
              <Route path="/admin/articles/new" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
              <Route path="/admin/articles/:id/edit" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
              <Route path="/admin/authors" element={<ProtectedRoute><Authors /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
              <Route path="/admin/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
              <Route path="/admin/cluster-generator" element={<ProtectedRoute><ClusterGenerator /></ProtectedRoute>} />
              <Route path="/admin/system-check" element={<ProtectedRoute><SystemCheck /></ProtectedRoute>} />
              <Route path="/admin/tools/batch-image-generation" element={<ProtectedRoute><BatchImageGeneration /></ProtectedRoute>} />
              <Route path="/admin/tools/bulk-speakable-regeneration" element={<ProtectedRoute><BulkSpeakableRegeneration /></ProtectedRoute>} />
              <Route path="/admin/tools/bulk-article-linker" element={<ProtectedRoute><BulkArticleLinker /></ProtectedRoute>} />
              <Route path="/admin/citation-health" element={<ProtectedRoute><CitationHealth /></ProtectedRoute>} />
              <Route path="/admin/docs/aeo-sge-guide" element={<ProtectedRoute><AEOGuide /></ProtectedRoute>} />
              <Route path="/admin/approved-domains" element={<ProtectedRoute><ApprovedDomains /></ProtectedRoute>} />
              <Route path="/admin/bulk-internal-links" element={<ProtectedRoute><BulkInternalLinks /></ProtectedRoute>} />
              <Route path="/admin/brochures" element={<ProtectedRoute><BrochureManager /></ProtectedRoute>} />
              <Route path="/admin/qa-generator" element={<ProtectedRoute><QAGenerator /></ProtectedRoute>} />
              <Route path="/admin/comparison-generator" element={<ProtectedRoute><ComparisonGenerator /></ProtectedRoute>} />
              <Route path="/admin/location-generator" element={<ProtectedRoute><LocationGenerator /></ProtectedRoute>} />
              <Route path="/admin/location-pages" element={<ProtectedRoute><LocationPages /></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
