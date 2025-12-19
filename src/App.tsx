import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/i18n";
import { ScrollToTop } from "@/components/ScrollToTop";

// ALL pages lazy loaded to prevent module loading crashes
const Home = lazy(() => import("./pages/Home"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const QAIndex = lazy(() => import("./pages/QAIndex"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const QAPage = lazy(() => import("./pages/QAPage"));
const PropertyFinder = lazy(() => import("./pages/PropertyFinder"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const CityBrochure = lazy(() => import("./pages/CityBrochure"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const Glossary = lazy(() => import("./pages/Glossary"));
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

const PageLoader = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTopColor: "#c5a059", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
      <p style={{ color: "#64748b", margin: 0 }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
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
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/qa" element={<QAIndex />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="/property-finder" element={<PropertyFinder />} />
              <Route path="/property/:reference" element={<PropertyDetail />} />
              <Route path="/brochure/:citySlug" element={<CityBrochure />} />
              <Route path="/qa/:slug" element={<QAPage />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
