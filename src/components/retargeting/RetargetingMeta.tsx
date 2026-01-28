import { Helmet } from "react-helmet";
import { getRetargetingTranslations } from "@/lib/retargetingTranslations";
import { retargetingRoutes } from "@/lib/retargetingRoutes";

interface RetargetingMetaProps {
  language: string;
}

// Locale mapping for Open Graph
const localeMap: Record<string, string> = {
  en: "en_GB",
  nl: "nl_NL",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  pl: "pl_PL",
  sv: "sv_SE",
  da: "da_DK",
  hu: "hu_HU",
  fi: "fi_FI",
  no: "nb_NO",
};

export const RetargetingMeta = ({ language }: RetargetingMetaProps) => {
  const t = getRetargetingTranslations(language);
  const baseUrl = "https://www.delsolprimehomes.com";
  const route = retargetingRoutes.find((r) => r.lang === language);
  const pageUrl = route ? `${baseUrl}${route.path}` : `${baseUrl}/en/welcome-back`;
  const locale = localeMap[language] || "en_GB";
  const ogImage = `${baseUrl}/images/retargeting-og.jpg`;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{t.metaTitle}</title>
      <meta name="description" content={t.metaDescription} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph */}
      <meta property="og:title" content={t.metaTitle} />
      <meta property="og:description" content={t.metaDescription} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={locale} />
      <meta property="og:site_name" content="Del Sol Prime Homes" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={t.metaTitle} />
      <meta name="twitter:description" content={t.metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Language */}
      <html lang={language} />
    </Helmet>
  );
};
