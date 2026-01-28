import { Helmet } from "react-helmet";
import { retargetingRoutes } from "@/lib/retargetingRoutes";

interface RetargetingHreflangProps {
  currentLang: string;
}

export const RetargetingHreflang = ({ currentLang }: RetargetingHreflangProps) => {
  const baseUrl = "https://www.delsolprimehomes.com";

  // Find current route for canonical
  const currentRoute = retargetingRoutes.find((r) => r.lang === currentLang);
  const canonicalUrl = currentRoute
    ? `${baseUrl}${currentRoute.path}`
    : `${baseUrl}/en/welcome-back`;

  return (
    <Helmet>
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for all languages */}
      {retargetingRoutes.map((route) => (
        <link
          key={route.lang}
          rel="alternate"
          hrefLang={route.lang}
          href={`${baseUrl}${route.path}`}
        />
      ))}

      {/* x-default (English) */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}/en/welcome-back`}
      />
    </Helmet>
  );
};
