import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/i18n";
import { ScrollToTop } from "@/components/ScrollToTop";
import {
  BlogRedirect,
  QARedirect,
  ComparisonRedirect,
  LocationIndexRedirect,
  LocationPageRedirect,
} from "@/components/LegacyRouteRedirects";
import { SUPPORTED_LANGUAGES } from "@/types/hreflang";

// Language-prefixed homepage wrapper - validates lang param and renders Home or NotFound
const LanguageHome = () => {
  const { lang } = useParams<{ lang: string }>();

  // If lang is 'en', redirect to root to avoid duplicate URLs
  if (lang === 'en') {
    return <Navigate to="/" replace />;
  }

  // Check if it's a valid language code (excluding 'en' which redirects above)
  const isValidLang = lang && SUPPORTED_LANGUAGES.includes(lang as typeof SUPPORTED_LANGUAGES[number]);

  if (!isValidLang) {
    return <NotFound />;
  }

  return <Home />;
};

// Eager load critical pages (landing pages)
import Home from "./pages/Home";
import BlogIndex from "./pages/BlogIndex";
import QAIndex from "./pages/QAIndex";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";

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
const About = lazy(() => import("./pages/About"));
const BuyersGuide = lazy(() => import("./pages/BuyersGuide"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

// Lazy load ALL admin pages (rarely accessed, heavy components)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProperties = lazy(() => import("./pages/AdminProperties"));
const PropertyForm = lazy(() => import("./pages/admin/PropertyForm"));
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
const QADashboard = lazy(() => import("./pages/admin/QADashboard"));
const ComparisonGenerator = lazy(() => import("./pages/admin/ComparisonGenerator"));
const LocationGenerator = lazy(() => import("./pages/admin/LocationGenerator"));
const LocationPages = lazy(() => import("./pages/admin/LocationPages"));
const BatchLocationImageGeneration = lazy(() => import("./pages/admin/BatchLocationImageGeneration"));
const Phase1LinkingTool = lazy(() => import("./pages/admin/Phase1LinkingTool"));
const BOFUPageGenerator = lazy(() => import("./pages/admin/BOFUPageGenerator"));
const NavbarImageGenerator = lazy(() => import("./pages/admin/NavbarImageGenerator"));
const SEOMonitor = lazy(() => import("./pages/admin/SEOMonitor"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const SchemaHealth = lazy(() => import("./pages/admin/SchemaHealth"));
const ClusterManager = lazy(() => import("./pages/admin/ClusterManager"));
const DuplicateImageFixer = lazy(() => import("./pages/admin/DuplicateImageFixer"));
const ImageHealthDashboard = lazy(() => import("./pages/admin/ImageHealthDashboard"));
const SystemAudit = lazy(() => import("./pages/admin/SystemAudit"));
const ProductionAudit = lazy(() => import("./pages/admin/ProductionAudit"));
const AEOAnswerFixer = lazy(() => import("./pages/admin/AEOAnswerFixer"));
const MigrateImages = lazy(() => import("./pages/admin/MigrateImages"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const EmmaConversations = lazy(() => import("./pages/admin/EmmaConversations"));
const GoneURLsManager = lazy(() => import("./pages/admin/GoneURLsManager"));
const RedirectChecker = lazy(() => import("./pages/admin/RedirectChecker"));
const BrokenLinkChecker = lazy(() => import("./pages/admin/BrokenLinkChecker"));
const BulkImageUpdate = lazy(() => import("./pages/admin/BulkImageUpdate"));
const WebhookTesting = lazy(() => import("./pages/admin/WebhookTesting"));

// CRM Pages
const AgentLogin = lazy(() => import("./pages/crm/AgentLogin"));
const CrmLogin = lazy(() => import("./pages/crm/CrmLogin"));

// Landing Pages (Paid Traffic)
const LandingEn = lazy(() => import("./pages/landing/en"));
const LandingNl = lazy(() => import("./pages/landing/nl"));
const LandingFr = lazy(() => import("./pages/landing/fr"));
const LandingDe = lazy(() => import("./pages/landing/de"));
const LandingFi = lazy(() => import("./pages/landing/fi"));
const LandingPl = lazy(() => import("./pages/landing/pl"));
const LandingDa = lazy(() => import("./pages/landing/da"));
const LandingHu = lazy(() => import("./pages/landing/hu"));
const LandingSv = lazy(() => import("./pages/landing/sv"));
const LandingNo = lazy(() => import("./pages/landing/no"));
const OptIn = lazy(() => import("./pages/OptIn"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

// Redirect component for legacy property routes
const PropertyRedirect = () => {
  const { reference } = useParams<{ reference: string }>();
  return <Navigate to={`/en/property/${reference}`} replace />;
};

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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Eager-loaded critical pages */}
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/thank-you" element={<ThankYou />} />

              {/* ========================================== */}
              {/* PROTECTED ADMIN ROUTES (MUST BE BEFORE /:lang) */}
              {/* ========================================== */}
              <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/properties" element={<ProtectedRoute><AdminProperties /></ProtectedRoute>} />
              <Route path="/admin/emma" element={<ProtectedRoute><EmmaConversations /></ProtectedRoute>} />
              <Route path="/admin/properties/new" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
              <Route path="/admin/properties/edit/:id" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
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
              <Route path="/admin/qa-dashboard" element={<ProtectedRoute><QADashboard /></ProtectedRoute>} />
              <Route path="/admin/comparison-generator" element={<ProtectedRoute><ComparisonGenerator /></ProtectedRoute>} />
              <Route path="/admin/location-generator" element={<ProtectedRoute><LocationGenerator /></ProtectedRoute>} />
              <Route path="/admin/location-pages" element={<ProtectedRoute><LocationPages /></ProtectedRoute>} />
              <Route path="/admin/batch-location-images" element={<ProtectedRoute><BatchLocationImageGeneration /></ProtectedRoute>} />
              <Route path="/admin/phase1-linking" element={<ProtectedRoute><Phase1LinkingTool /></ProtectedRoute>} />
              <Route path="/admin/bofu-generator" element={<ProtectedRoute><BOFUPageGenerator /></ProtectedRoute>} />
              <Route path="/admin/navbar-images" element={<ProtectedRoute><NavbarImageGenerator /></ProtectedRoute>} />
              <Route path="/admin/seo-monitor" element={<ProtectedRoute><SEOMonitor /></ProtectedRoute>} />
              <Route path="/admin/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
              <Route path="/admin/schema-health" element={<ProtectedRoute><SchemaHealth /></ProtectedRoute>} />
              <Route path="/admin/clusters" element={<ProtectedRoute><ClusterManager /></ProtectedRoute>} />
              <Route path="/admin/duplicate-images" element={<ProtectedRoute><DuplicateImageFixer /></ProtectedRoute>} />
              <Route path="/admin/image-health" element={<ProtectedRoute><ImageHealthDashboard /></ProtectedRoute>} />
              <Route path="/admin/system-audit" element={<ProtectedRoute><SystemAudit /></ProtectedRoute>} />
              <Route path="/admin/production-audit" element={<ProtectedRoute><ProductionAudit /></ProtectedRoute>} />
              <Route path="/admin/aeo-fixer" element={<ProtectedRoute><AEOAnswerFixer /></ProtectedRoute>} />
              <Route path="/admin/migrate-images" element={<ProtectedRoute><MigrateImages /></ProtectedRoute>} />
              <Route path="/admin/gone-urls" element={<ProtectedRoute><GoneURLsManager /></ProtectedRoute>} />
              <Route path="/admin/redirect-checker" element={<ProtectedRoute><RedirectChecker /></ProtectedRoute>} />
              <Route path="/admin/broken-links" element={<ProtectedRoute><BrokenLinkChecker /></ProtectedRoute>} />
              <Route path="/admin/bulk-image-update" element={<ProtectedRoute><BulkImageUpdate /></ProtectedRoute>} />
              <Route path="/admin/webhook-testing" element={<ProtectedRoute><WebhookTesting /></ProtectedRoute>} />

              {/* Standalone Property Management Page */}
              <Route path="/add-property" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />

              {/* CRM Routes */}
              <Route path="/crm/login" element={<CrmLogin />} />
              <Route path="/crm/agent/login" element={<AgentLogin />} />

              {/* ========================================== */}
              {/* OTHER PUBLIC ROUTES (no language prefix)  */}
              {/* MUST BE BEFORE /:lang dynamic route       */}
              {/* ========================================== */}
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/glossary" element={<Navigate to="/en/glossary" replace />} />
              <Route path="/:lang/glossary" element={<Glossary />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Landing Pages (Paid Traffic) */}
              <Route path="/en/landing" element={<LandingEn />} />
              <Route path="/nl/landing" element={<LandingNl />} />
              <Route path="/fr/landing" element={<LandingFr />} />
              <Route path="/de/landing" element={<LandingDe />} />
              <Route path="/fi/landing" element={<LandingFi />} />
              <Route path="/pl/landing" element={<LandingPl />} />
              <Route path="/da/landing" element={<LandingDa />} />
              <Route path="/hu/landing" element={<LandingHu />} />
              <Route path="/sv/landing" element={<LandingSv />} />
              <Route path="/no/landing" element={<LandingNo />} />
              <Route path="/optin" element={<OptIn />} />
              <Route path="/:lang/optin" element={<OptIn />} />

              {/* Legacy redirect for brochures - redirect to English */}
              <Route path="/brochure/:citySlug" element={<Navigate to={window.location.pathname.replace('/brochure/', '/en/brochure/')} replace />} />
              {/* Language-prefixed brochure routes */}
              <Route path="/:lang/brochure/:citySlug" element={<CityBrochure />} />
              <Route path="/about" element={<About />} />
              <Route path="/buyers-guide" element={<Navigate to="/en/buyers-guide" replace />} />
              <Route path="/:lang/buyers-guide" element={<BuyersGuide />} />

              {/* ========================================== */}
              {/* LANGUAGE-PREFIXED ROUTES (Phase 2)        */}
              {/* ========================================== */}

              {/* Language-prefixed homepage */}
              <Route path="/:lang" element={<LanguageHome />} />

              {/* Blog routes with language prefix */}
              <Route path="/:lang/blog" element={<BlogIndex />} />
              <Route path="/:lang/blog/:slug" element={<BlogArticle />} />

              {/* Q&A routes with language prefix */}
              <Route path="/:lang/qa" element={<QAIndex />} />
              <Route path="/:lang/qa/:slug" element={<QAPage />} />

              {/* Comparison routes with language prefix */}
              <Route path="/:lang/compare" element={<ComparisonIndex />} />
              <Route path="/:lang/compare/:slug" element={<ComparisonPage />} />

              {/* Location routes with language prefix */}
              <Route path="/:lang/locations" element={<LocationHub />} />
              <Route path="/:lang/locations/:citySlug" element={<LocationIndex />} />
              <Route path="/:lang/locations/:citySlug/:topicSlug" element={<LocationPage />} />

              {/* Property routes with language prefix */}
              <Route path="/:lang/properties" element={<PropertyFinder />} />
              <Route path="/:lang/property/:reference" element={<PropertyDetail />} />

              {/* ========================================== */}
              {/* LEGACY ROUTES -> REDIRECT TO /en/...      */}
              {/* ========================================== */}

              {/* Blog legacy redirects */}
              <Route path="/blog" element={<Navigate to="/en/blog" replace />} />
              <Route path="/blog/:slug" element={<BlogRedirect />} />

              {/* Q&A legacy redirects */}
              <Route path="/qa" element={<Navigate to="/en/qa" replace />} />
              <Route path="/qa/:slug" element={<QARedirect />} />

              {/* Comparison legacy redirects */}
              <Route path="/compare" element={<Navigate to="/en/compare" replace />} />
              <Route path="/compare/:slug" element={<ComparisonRedirect />} />

              {/* Location legacy redirects */}
              <Route path="/locations" element={<Navigate to="/en/locations" replace />} />
              <Route path="/locations/:citySlug" element={<LocationIndexRedirect />} />
              <Route path="/locations/:citySlug/:topicSlug" element={<LocationPageRedirect />} />

              {/* Property legacy redirects */}
              <Route path="/properties" element={<Navigate to="/en/properties" replace />} />
              <Route path="/property-finder" element={<Navigate to="/en/properties" replace />} />
              <Route path="/property/:reference" element={<PropertyRedirect />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
