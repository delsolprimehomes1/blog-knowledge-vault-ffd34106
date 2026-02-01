import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Globe, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LanguageMismatchNotFoundProps {
  requestedLang: string;
  actualLang: string;
  slug: string;
  translations: Record<string, string | { id: string; slug: string }> | null;
  contentType: "blog" | "qa" | "compare" | "locations";
}

// Localized language names for each supported language
const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: {
    en: "English",
    nl: "Dutch",
    de: "German",
    fr: "French",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    pl: "Polish",
    hu: "Hungarian",
  },
  nl: {
    en: "Engels",
    nl: "Nederlands",
    de: "Duits",
    fr: "Frans",
    sv: "Zweeds",
    no: "Noors",
    da: "Deens",
    fi: "Fins",
    pl: "Pools",
    hu: "Hongaars",
  },
  de: {
    en: "Englisch",
    nl: "Niederländisch",
    de: "Deutsch",
    fr: "Französisch",
    sv: "Schwedisch",
    no: "Norwegisch",
    da: "Dänisch",
    fi: "Finnisch",
    pl: "Polnisch",
    hu: "Ungarisch",
  },
  fr: {
    en: "Anglais",
    nl: "Néerlandais",
    de: "Allemand",
    fr: "Français",
    sv: "Suédois",
    no: "Norvégien",
    da: "Danois",
    fi: "Finlandais",
    pl: "Polonais",
    hu: "Hongrois",
  },
  sv: {
    en: "Engelska",
    nl: "Nederländska",
    de: "Tyska",
    fr: "Franska",
    sv: "Svenska",
    no: "Norska",
    da: "Danska",
    fi: "Finska",
    pl: "Polska",
    hu: "Ungerska",
  },
  no: {
    en: "Engelsk",
    nl: "Nederlandsk",
    de: "Tysk",
    fr: "Fransk",
    sv: "Svensk",
    no: "Norsk",
    da: "Dansk",
    fi: "Finsk",
    pl: "Polsk",
    hu: "Ungarsk",
  },
  da: {
    en: "Engelsk",
    nl: "Hollandsk",
    de: "Tysk",
    fr: "Fransk",
    sv: "Svensk",
    no: "Norsk",
    da: "Dansk",
    fi: "Finsk",
    pl: "Polsk",
    hu: "Ungarsk",
  },
  fi: {
    en: "Englanti",
    nl: "Hollanti",
    de: "Saksa",
    fr: "Ranska",
    sv: "Ruotsi",
    no: "Norja",
    da: "Tanska",
    fi: "Suomi",
    pl: "Puola",
    hu: "Unkari",
  },
  pl: {
    en: "Angielski",
    nl: "Holenderski",
    de: "Niemiecki",
    fr: "Francuski",
    sv: "Szwedzki",
    no: "Norweski",
    da: "Duński",
    fi: "Fiński",
    pl: "Polski",
    hu: "Węgierski",
  },
  hu: {
    en: "Angol",
    nl: "Holland",
    de: "Német",
    fr: "Francia",
    sv: "Svéd",
    no: "Norvég",
    da: "Dán",
    fi: "Finn",
    pl: "Lengyel",
    hu: "Magyar",
  },
};

// Localized UI strings
const UI_STRINGS: Record<
  string,
  {
    title: string;
    subtitle: string;
    availableIn: string;
    viewIn: string;
    browseAll: string;
  }
> = {
  en: {
    title: "Content Not Available",
    subtitle: "This content is not yet available in your selected language.",
    availableIn: "Available in:",
    viewIn: "View in",
    browseAll: "Browse all content",
  },
  nl: {
    title: "Inhoud Niet Beschikbaar",
    subtitle: "Deze inhoud is nog niet beschikbaar in de geselecteerde taal.",
    availableIn: "Beschikbaar in:",
    viewIn: "Bekijk in het",
    browseAll: "Bekijk alle inhoud",
  },
  de: {
    title: "Inhalt Nicht Verfügbar",
    subtitle:
      "Dieser Inhalt ist in der ausgewählten Sprache noch nicht verfügbar.",
    availableIn: "Verfügbar in:",
    viewIn: "Ansehen auf",
    browseAll: "Alle Inhalte durchsuchen",
  },
  fr: {
    title: "Contenu Non Disponible",
    subtitle:
      "Ce contenu n'est pas encore disponible dans la langue sélectionnée.",
    availableIn: "Disponible en:",
    viewIn: "Voir en",
    browseAll: "Parcourir tout le contenu",
  },
  sv: {
    title: "Innehåll Inte Tillgängligt",
    subtitle: "Detta innehåll är ännu inte tillgängligt på det valda språket.",
    availableIn: "Tillgängligt på:",
    viewIn: "Visa på",
    browseAll: "Bläddra bland allt innehåll",
  },
  no: {
    title: "Innhold Ikke Tilgjengelig",
    subtitle: "Dette innholdet er ennå ikke tilgjengelig på det valgte språket.",
    availableIn: "Tilgjengelig på:",
    viewIn: "Vis på",
    browseAll: "Bla gjennom alt innhold",
  },
  da: {
    title: "Indhold Ikke Tilgængeligt",
    subtitle: "Dette indhold er endnu ikke tilgængeligt på det valgte sprog.",
    availableIn: "Tilgængelig på:",
    viewIn: "Se på",
    browseAll: "Gennemse alt indhold",
  },
  fi: {
    title: "Sisältö Ei Saatavilla",
    subtitle: "Tämä sisältö ei ole vielä saatavilla valitulla kielellä.",
    availableIn: "Saatavilla:",
    viewIn: "Näytä kielellä",
    browseAll: "Selaa kaikkea sisältöä",
  },
  pl: {
    title: "Treść Niedostępna",
    subtitle: "Ta treść nie jest jeszcze dostępna w wybranym języku.",
    availableIn: "Dostępne w:",
    viewIn: "Zobacz w języku",
    browseAll: "Przeglądaj całą zawartość",
  },
  hu: {
    title: "Tartalom Nem Elérhető",
    subtitle: "Ez a tartalom még nem érhető el a kiválasztott nyelven.",
    availableIn: "Elérhető:",
    viewIn: "Megtekintés nyelven",
    browseAll: "Összes tartalom böngészése",
  },
};

// Get the base path for each content type
const CONTENT_BASE_PATHS: Record<string, string> = {
  blog: "blog",
  qa: "qa",
  compare: "compare",
  locations: "locations",
};

/**
 * Helper to extract slug string from translations JSONB
 * The translations column can contain either:
 * - Simple strings: { "en": "slug-here" }
 * - Objects: { "en": { "id": "uuid", "slug": "slug-here" } }
 */
function getSlugFromTranslation(
  value: string | { id: string; slug: string } | undefined
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "slug" in value) return value.slug;
  return null;
}

export function LanguageMismatchNotFound({
  requestedLang,
  actualLang,
  slug,
  translations,
  contentType,
}: LanguageMismatchNotFoundProps) {
  const ui = UI_STRINGS[requestedLang] || UI_STRINGS.en;
  const langNames = LANGUAGE_NAMES[requestedLang] || LANGUAGE_NAMES.en;
  const basePath = CONTENT_BASE_PATHS[contentType];

  // Build list of available translations
  const availableTranslations: { lang: string; slug: string; name: string }[] =
    [];

  // Always include the original language
  availableTranslations.push({
    lang: actualLang,
    slug: slug,
    name: langNames[actualLang] || actualLang.toUpperCase(),
  });

  // Add other translations from the JSONB
  if (translations) {
    Object.entries(translations).forEach(([lang, value]) => {
      if (lang === actualLang) return; // Skip the original, already added
      const translatedSlug = getSlugFromTranslation(value);
      if (translatedSlug) {
        availableTranslations.push({
          lang,
          slug: translatedSlug,
          name: langNames[lang] || lang.toUpperCase(),
        });
      }
    });
  }

  // Sort: English first (if available), then alphabetically
  availableTranslations.sort((a, b) => {
    if (a.lang === "en") return -1;
    if (b.lang === "en") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>{ui.title} | Del Sol Prime Homes</title>
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-prime-gold/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <Globe className="h-10 w-10 text-prime-gold" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              {ui.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground mb-10">{ui.subtitle}</p>

            {/* Available Languages */}
            {availableTranslations.length > 0 && (
              <div className="mb-10">
                <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                  {ui.availableIn}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {availableTranslations.map(({ lang, slug: translatedSlug, name }) => (
                    <Link
                      key={lang}
                      to={`/${lang}/${basePath}/${translatedSlug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-full text-sm font-medium text-foreground hover:bg-prime-gold/10 hover:border-prime-gold/30 hover:text-prime-gold transition-all duration-300 shadow-sm"
                    >
                      <span className="font-semibold text-prime-gold uppercase">
                        {lang}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>{name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Primary: View in Original Language */}
              <Button asChild size="lg" className="group">
                <Link to={`/${actualLang}/${basePath}/${slug}`}>
                  {ui.viewIn} {langNames[actualLang] || actualLang.toUpperCase()}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              {/* Secondary: Browse Index in Requested Language */}
              <Button asChild variant="outline" size="lg">
                <Link to={`/${requestedLang}/${basePath}`}>
                  <Home className="mr-2 h-4 w-4" />
                  {ui.browseAll}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
