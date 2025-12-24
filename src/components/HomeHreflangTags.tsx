import { Helmet } from 'react-helmet';
import { SUPPORTED_LANGUAGES, BASE_URL } from '@/types/hreflang';

interface HreflangTag {
  hreflang: string;
  href: string;
}

export const HomeHreflangTags = () => {
  // Generate hreflang tags for all supported languages
  const hreflangTags: HreflangTag[] = SUPPORTED_LANGUAGES.map((lang) => ({
    hreflang: lang,
    href: lang === 'en' ? BASE_URL : `${BASE_URL}/${lang}`,
  }));

  // Add x-default pointing to English version
  hreflangTags.push({
    hreflang: 'x-default',
    href: BASE_URL,
  });

  return (
    <Helmet>
      {hreflangTags.map((tag) => (
        <link
          key={tag.hreflang}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}
    </Helmet>
  );
};
