import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { TeamHero } from "@/components/team/TeamHero";
import { TeamGrid } from "@/components/team/TeamGrid";
import { useTranslation } from "@/i18n";
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';
import { COMPANY_INFO } from "@/constants/company";

const BASE_URL = "https://www.delsolprimehomes.com";

const Team = () => {
  const { lang } = useParams<{ lang: string }>();
  const { t, currentLanguage } = useTranslation();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Generate JSON-LD schema for the team
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}/#organization`,
    "name": COMPANY_INFO.name,
    "description": t.team?.meta?.description || "Meet the expert real estate professionals at Del Sol Prime Homes.",
    "url": BASE_URL,
    "logo": `${BASE_URL}/logo.png`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "C. Alfonso XIII, 6",
      "addressLocality": "Fuengirola",
      "postalCode": "29640",
      "addressRegion": "Málaga",
      "addressCountry": "ES"
    },
    "telephone": "+34630039090",
    "email": "info@delsolprimehomes.com",
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 36.5,
        "longitude": -4.9
      },
      "geoRadius": "100km"
    },
    "knowsLanguage": ["en", "nl", "de", "fr", "sv", "no", "da", "fi", "pl", "hu"]
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          <TeamHero />
          <TeamGrid />
        </main>

        <Footer />
        <BlogEmmaChat language={lang || 'en'} />
      </div>
    </>
  );
};

export default Team;
