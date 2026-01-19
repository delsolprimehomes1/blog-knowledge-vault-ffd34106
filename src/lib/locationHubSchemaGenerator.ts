/**
 * Location Hub Schema Generator
 * Generates comprehensive JSON-LD schemas for the /{lang}/locations hub page
 * Optimized for AEO, GEO, and voice assistants
 */

const BASE_URL = 'https://www.delsolprimehomes.com';

// Locale mapping for og:locale
const LOCALE_MAP: Record<string, string> = {
  en: 'en_GB',
  de: 'de_DE',
  fr: 'fr_FR',
  nl: 'nl_NL',
  sv: 'sv_SE',
  no: 'nb_NO',
  da: 'da_DK',
  fi: 'fi_FI',
  pl: 'pl_PL',
  hu: 'hu_HU',
};

export const SUPPORTED_LANGUAGES = ['en', 'nl', 'hu', 'de', 'fr', 'sv', 'pl', 'no', 'fi', 'da'];

// Organization schema (reused across all schemas)
const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  "name": "Del Sol Prime Homes",
  "url": BASE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${BASE_URL}/assets/logo-new.png`,
    "width": 512,
    "height": 512
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
    "addressLocality": "Fuengirola",
    "addressRegion": "Málaga",
    "postalCode": "29640",
    "addressCountry": "ES"
  },
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "license",
    "name": "Agente de la Propiedad Inmobiliaria (API)",
    "recognizedBy": {
      "@type": "Organization",
      "name": "Colegio Oficial de Agentes de la Propiedad Inmobiliaria"
    }
  }
};

export interface HubCity {
  name: string;
  slug: string;
  guideCount: number;
}

export interface LocationHubMetadata {
  language: string;
  title: string;
  description: string;
  speakableSummary: string;
  cities: HubCity[];
  totalGuides: number;
  intentTypes: number;
}

/**
 * UI labels interface for the hub
 */
interface HubUILabels {
  title: string;
  description: string;
  speakableSummary: string;
  statsLabels: {
    cities: string;
    guides: string;
    languages: string;
    dataPoints: string;
  };
  heroTitle: string;
  heroSubtitle: string;
  scrollCta: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButton1: string;
  ctaButton2: string;
  breadcrumbs: {
    home: string;
    locations: string;
  };
}

/**
 * Get localized hub content
 */
export function getLocalizedHubContent(lang: string): HubUILabels {
  const content: Record<string, HubUILabels> = {
    en: {
      title: "Costa del Sol Location Guides | Del Sol Prime Homes",
      description: "Explore comprehensive location guides for the Costa del Sol. Expert insights on property buying, best areas, cost of living, and investment opportunities in Marbella, Estepona, Fuengirola, and more.",
      speakableSummary: "Our Costa del Sol Location Guides are comprehensive resources covering 8 cities across the region. Each guide addresses specific buyer intents including family relocation, retirement planning, property investment, and cost of living analysis. Every page features expert insights, neighborhood breakdowns, price comparisons, and actionable recommendations to help you make informed real estate decisions.",
      statsLabels: { cities: "Cities", guides: "Guides", languages: "Languages", dataPoints: "Data Points" },
      heroTitle: "Real Estate Intelligence",
      heroSubtitle: "for {count} Cities",
      scrollCta: "Explore",
      ctaTitle: "Ready to Find Your Perfect Location?",
      ctaDescription: "Our expert team is ready to help you navigate the Costa del Sol property market.",
      ctaButton1: "Book a Consultation",
      ctaButton2: "Browse Properties",
      breadcrumbs: { home: "Home", locations: "Locations" }
    },
    nl: {
      title: "Costa del Sol Locatiegidsen | Del Sol Prime Homes",
      description: "Ontdek uitgebreide locatiegidsen voor de Costa del Sol. Expert inzichten over vastgoedaankoop, beste gebieden, kosten van levensonderhoud en investeringsmogelijkheden in Marbella, Estepona, Fuengirola en meer.",
      speakableSummary: "Onze Costa del Sol Locatiegidsen zijn uitgebreide bronnen voor 8 steden in de regio. Elke gids behandelt specifieke kopersbehoeften zoals gezinsverhuizing, pensioenplanning, vastgoedinvesteringen en kosten van levensonderhoud.",
      statsLabels: { cities: "Steden", guides: "Gidsen", languages: "Talen", dataPoints: "Datapunten" },
      heroTitle: "Vastgoed Intelligentie",
      heroSubtitle: "voor {count} Steden",
      scrollCta: "Ontdek",
      ctaTitle: "Klaar om uw perfecte locatie te vinden?",
      ctaDescription: "Ons expertteam staat klaar om u te helpen bij het navigeren op de Costa del Sol vastgoedmarkt.",
      ctaButton1: "Boek een Consultatie",
      ctaButton2: "Bekijk Woningen",
      breadcrumbs: { home: "Home", locations: "Locaties" }
    },
    de: {
      title: "Costa del Sol Standortführer | Del Sol Prime Homes",
      description: "Entdecken Sie umfassende Standortführer für die Costa del Sol. Experteneinblicke zu Immobilienkauf, besten Gegenden, Lebenshaltungskosten und Investitionsmöglichkeiten in Marbella, Estepona, Fuengirola und mehr.",
      speakableSummary: "Unsere Costa del Sol Standortführer sind umfassende Ressourcen für 8 Städte in der Region. Jeder Führer behandelt spezifische Käuferbedürfnisse wie Familienumzug, Ruhestandsplanung, Immobilieninvestitionen und Lebenshaltungskosten.",
      statsLabels: { cities: "Städte", guides: "Führer", languages: "Sprachen", dataPoints: "Datenpunkte" },
      heroTitle: "Immobilien-Intelligenz",
      heroSubtitle: "für {count} Städte",
      scrollCta: "Entdecken",
      ctaTitle: "Bereit, Ihren perfekten Standort zu finden?",
      ctaDescription: "Unser Expertenteam hilft Ihnen gerne bei der Navigation auf dem Costa del Sol Immobilienmarkt.",
      ctaButton1: "Beratung buchen",
      ctaButton2: "Immobilien durchsuchen",
      breadcrumbs: { home: "Startseite", locations: "Standorte" }
    },
    fr: {
      title: "Guides des Emplacements Costa del Sol | Del Sol Prime Homes",
      description: "Explorez des guides d'emplacement complets pour la Costa del Sol. Informations d'experts sur l'achat immobilier, les meilleurs quartiers, le coût de la vie et les opportunités d'investissement à Marbella, Estepona, Fuengirola et plus.",
      speakableSummary: "Nos guides d'emplacement Costa del Sol sont des ressources complètes couvrant 8 villes de la région. Chaque guide aborde des besoins spécifiques des acheteurs tels que la relocalisation familiale, la planification de la retraite et les investissements immobiliers.",
      statsLabels: { cities: "Villes", guides: "Guides", languages: "Langues", dataPoints: "Données" },
      heroTitle: "Intelligence Immobilière",
      heroSubtitle: "pour {count} Villes",
      scrollCta: "Explorer",
      ctaTitle: "Prêt à trouver votre emplacement idéal?",
      ctaDescription: "Notre équipe d'experts est prête à vous aider à naviguer sur le marché immobilier de la Costa del Sol.",
      ctaButton1: "Réserver une Consultation",
      ctaButton2: "Parcourir les Propriétés",
      breadcrumbs: { home: "Accueil", locations: "Emplacements" }
    },
    sv: {
      title: "Costa del Sol Platsguider | Del Sol Prime Homes",
      description: "Utforska omfattande platsguider för Costa del Sol. Expertinsikter om fastighetsköp, bästa områden, levnadskostnader och investeringsmöjligheter i Marbella, Estepona, Fuengirola och mer.",
      speakableSummary: "Våra Costa del Sol platsguider är omfattande resurser som täcker 8 städer i regionen. Varje guide behandlar specifika köparbehov som familjeflytt, pensionsplanering och fastighetsinvesteringar.",
      statsLabels: { cities: "Städer", guides: "Guider", languages: "Språk", dataPoints: "Datapunkter" },
      heroTitle: "Fastighets Intelligens",
      heroSubtitle: "för {count} Städer",
      scrollCta: "Utforska",
      ctaTitle: "Redo att hitta din perfekta plats?",
      ctaDescription: "Vårt expertteam är redo att hjälpa dig navigera på Costa del Sols fastighetsmarknad.",
      ctaButton1: "Boka en Konsultation",
      ctaButton2: "Bläddra Fastigheter",
      breadcrumbs: { home: "Hem", locations: "Platser" }
    },
    no: {
      title: "Costa del Sol Stedsguider | Del Sol Prime Homes",
      description: "Utforsk omfattende stedsguider for Costa del Sol. Ekspertinnsikt om eiendomskjøp, beste områder, levekostnader og investeringsmuligheter i Marbella, Estepona, Fuengirola og mer.",
      speakableSummary: "Våre Costa del Sol stedsguider er omfattende ressurser som dekker 8 byer i regionen. Hver guide tar for seg spesifikke kjøperbehov som familieflytting, pensjonsplanlegging og eiendomsinvesteringer.",
      statsLabels: { cities: "Byer", guides: "Guider", languages: "Språk", dataPoints: "Datapunkter" },
      heroTitle: "Eiendoms Intelligens",
      heroSubtitle: "for {count} Byer",
      scrollCta: "Utforsk",
      ctaTitle: "Klar til å finne din perfekte plassering?",
      ctaDescription: "Vårt ekspertteam er klare til å hjelpe deg med å navigere på Costa del Sols eiendomsmarked.",
      ctaButton1: "Book en Konsultasjon",
      ctaButton2: "Bla gjennom Eiendommer",
      breadcrumbs: { home: "Hjem", locations: "Steder" }
    },
    da: {
      title: "Costa del Sol Stedguider | Del Sol Prime Homes",
      description: "Udforsk omfattende stedguider for Costa del Sol. Ekspertindsigt i ejendomskøb, bedste områder, leveomkostninger og investeringsmuligheder i Marbella, Estepona, Fuengirola og mere.",
      speakableSummary: "Vores Costa del Sol stedguider er omfattende ressourcer, der dækker 8 byer i regionen. Hver guide behandler specifikke køberbehov som familieflytning, pensionsplanlægning og ejendomsinvesteringer.",
      statsLabels: { cities: "Byer", guides: "Guider", languages: "Sprog", dataPoints: "Datapunkter" },
      heroTitle: "Ejendoms Intelligens",
      heroSubtitle: "for {count} Byer",
      scrollCta: "Udforsk",
      ctaTitle: "Klar til at finde din perfekte placering?",
      ctaDescription: "Vores ekspertteam er klar til at hjælpe dig med at navigere på Costa del Sols ejendomsmarked.",
      ctaButton1: "Book en Konsultation",
      ctaButton2: "Gennemse Ejendomme",
      breadcrumbs: { home: "Hjem", locations: "Steder" }
    },
    fi: {
      title: "Costa del Sol Sijaintioppaat | Del Sol Prime Homes",
      description: "Tutustu kattaviin sijaintioppaisiin Costa del Solille. Asiantuntijatietoa kiinteistöjen ostosta, parhaista alueista, elinkustannuksista ja sijoitusmahdollisuuksista Marbellassa, Esteponassa, Fuengirolassa ja muualla.",
      speakableSummary: "Costa del Sol sijaintioppaamme ovat kattavia resursseja, jotka kattavat 8 kaupunkia alueella. Jokainen opas käsittelee tiettyjä ostajien tarpeita, kuten perheen muuttoa, eläkesuunnittelua ja kiinteistösijoituksia.",
      statsLabels: { cities: "Kaupungit", guides: "Oppaat", languages: "Kielet", dataPoints: "Datapisteet" },
      heroTitle: "Kiinteistö Älykkyys",
      heroSubtitle: "{count} Kaupungille",
      scrollCta: "Tutustu",
      ctaTitle: "Valmis löytämään täydellisen sijaintisi?",
      ctaDescription: "Asiantuntijatiimimme on valmis auttamaan sinua Costa del Solin kiinteistömarkkinoilla.",
      ctaButton1: "Varaa Konsultaatio",
      ctaButton2: "Selaa Kiinteistöjä",
      breadcrumbs: { home: "Koti", locations: "Sijainnit" }
    },
    pl: {
      title: "Przewodniki po Lokalizacjach Costa del Sol | Del Sol Prime Homes",
      description: "Odkryj kompleksowe przewodniki po lokalizacjach Costa del Sol. Eksperckie informacje o zakupie nieruchomości, najlepszych dzielnicach, kosztach życia i możliwościach inwestycyjnych w Marbelli, Esteponie, Fuengiroli i nie tylko.",
      speakableSummary: "Nasze przewodniki po lokalizacjach Costa del Sol to kompleksowe zasoby obejmujące 8 miast w regionie. Każdy przewodnik odpowiada na konkretne potrzeby kupujących, takie jak przeprowadzka rodziny, planowanie emerytury i inwestycje w nieruchomości.",
      statsLabels: { cities: "Miasta", guides: "Przewodniki", languages: "Języki", dataPoints: "Dane" },
      heroTitle: "Inteligencja Nieruchomości",
      heroSubtitle: "dla {count} Miast",
      scrollCta: "Odkryj",
      ctaTitle: "Gotowy znaleźć swoją idealną lokalizację?",
      ctaDescription: "Nasz zespół ekspertów jest gotowy pomóc Ci w nawigacji po rynku nieruchomości Costa del Sol.",
      ctaButton1: "Zarezerwuj Konsultację",
      ctaButton2: "Przeglądaj Nieruchomości",
      breadcrumbs: { home: "Strona główna", locations: "Lokalizacje" }
    },
    hu: {
      title: "Costa del Sol Helyszín Útmutatók | Del Sol Prime Homes",
      description: "Fedezze fel a Costa del Sol átfogó helyszín útmutatóit. Szakértői betekintés az ingatlanvásárlásba, a legjobb területekbe, a megélhetési költségekbe és a befektetési lehetőségekbe Marbellában, Esteponában, Fuengirolában és máshol.",
      speakableSummary: "Costa del Sol helyszín útmutatóink átfogó források, amelyek 8 várost fednek le a régióban. Minden útmutató konkrét vásárlói igényekre válaszol, mint például családi költözés, nyugdíjtervezés és ingatlan befektetések.",
      statsLabels: { cities: "Városok", guides: "Útmutatók", languages: "Nyelvek", dataPoints: "Adatpontok" },
      heroTitle: "Ingatlan Intelligencia",
      heroSubtitle: "{count} Városra",
      scrollCta: "Felfedezés",
      ctaTitle: "Készen áll megtalálni a tökéletes helyszínt?",
      ctaDescription: "Szakértői csapatunk készen áll, hogy segítsen eligazodni a Costa del Sol ingatlanpiacán.",
      ctaButton1: "Konzultáció Foglalása",
      ctaButton2: "Ingatlanok Böngészése",
      breadcrumbs: { home: "Kezdőlap", locations: "Helyszínek" }
    }
  };

  return content[lang] || content.en;
}

/**
 * Get localized FAQ content for the hub
 */
export function getLocalizedHubFAQs(lang: string): Array<{ question: string; answer: string }> {
  const faqs: Record<string, Array<{ question: string; answer: string }>> = {
    en: [
      {
        question: "What are Location Intelligence Pages?",
        answer: "Location Intelligence Pages are comprehensive guides to Costa del Sol cities, covering property buying, investment opportunities, cost of living, best areas for families, retirement guides, and more. Each guide provides expert insights and actionable recommendations."
      },
      {
        question: "Which cities are covered in the Costa del Sol location guides?",
        answer: "Our guides cover 8 major cities: Marbella, Estepona, Fuengirola, Benalmádena, Torremolinos, Málaga, Casares, and Mijas. Each city has multiple guides covering different buyer intents and topics."
      },
      {
        question: "What topics do the location guides cover?",
        answer: "Our guides cover 8 intent types: Property Buying, Best Areas for Families, Investment Areas, Expat Guide, Retirement Guide, Cost of Living, Property Prices, and Relocation Guide. Each provides detailed, localized information."
      },
      {
        question: "Are the location guides available in my language?",
        answer: "Yes! Our guides are available in 10 languages: English, German, Dutch, French, Swedish, Norwegian, Danish, Finnish, Polish, and Hungarian. Each version is professionally translated and localized."
      },
      {
        question: "How often are the Costa del Sol location guides updated?",
        answer: "Our guides are regularly updated to reflect current market conditions, pricing trends, and local developments. We aim to review and update content quarterly to ensure accuracy and relevance."
      }
    ],
    nl: [
      {
        question: "Wat zijn Locatie Intelligence Pagina's?",
        answer: "Locatie Intelligence Pagina's zijn uitgebreide gidsen voor Costa del Sol steden, met informatie over vastgoedaankoop, investeringsmogelijkheden, kosten van levensonderhoud, beste gebieden voor gezinnen, pensioengidsen en meer."
      },
      {
        question: "Welke steden worden behandeld in de Costa del Sol locatiegidsen?",
        answer: "Onze gidsen behandelen 8 grote steden: Marbella, Estepona, Fuengirola, Benalmádena, Torremolinos, Málaga, Casares en Mijas."
      },
      {
        question: "Welke onderwerpen behandelen de locatiegidsen?",
        answer: "Onze gidsen behandelen 8 intentietypes: Vastgoedaankoop, Beste Gebieden voor Gezinnen, Investeringsgebieden, Expat Gids, Pensioengids, Kosten van Levensonderhoud, Vastgoedprijzen en Verhuisgids."
      },
      {
        question: "Zijn de locatiegidsen beschikbaar in mijn taal?",
        answer: "Ja! Onze gidsen zijn beschikbaar in 10 talen: Engels, Duits, Nederlands, Frans, Zweeds, Noors, Deens, Fins, Pools en Hongaars."
      },
      {
        question: "Hoe vaak worden de Costa del Sol locatiegidsen bijgewerkt?",
        answer: "Onze gidsen worden regelmatig bijgewerkt om actuele marktomstandigheden, prijstrends en lokale ontwikkelingen weer te geven."
      }
    ]
  };

  return faqs[lang] || faqs.en;
}

/**
 * Generate WebPage schema with SpeakableSpecification for the hub
 */
export function generateHubWebPageSchema(lang: string): object {
  const content = getLocalizedHubContent(lang);
  const canonicalUrl = `${BASE_URL}/${lang}/locations`;

  return {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": content.title,
    "description": content.description,
    "inLanguage": LOCALE_MAP[lang] || 'en_GB',
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "name": "Del Sol Prime Homes",
      "url": BASE_URL,
      "publisher": { "@id": `${BASE_URL}/#organization` }
    },
    "about": {
      "@type": "Place",
      "name": "Costa del Sol",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "Málaga",
        "addressCountry": "ES"
      }
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["#speakable-summary", ".speakable-hub-intro", ".speakable-answer", ".speakable-box"]
    },
    "datePublished": "2024-01-15",
    "dateModified": new Date().toISOString().split('T')[0]
  };
}

/**
 * Generate CollectionPage schema
 */
export function generateHubCollectionPageSchema(lang: string, metadata: LocationHubMetadata): object {
  const canonicalUrl = `${BASE_URL}/${lang}/locations`;

  return {
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collectionpage`,
    "name": metadata.title,
    "description": metadata.description,
    "url": canonicalUrl,
    "inLanguage": LOCALE_MAP[lang] || 'en_GB',
    "mainEntity": {
      "@type": "ItemList",
      "@id": `${canonicalUrl}#citylist`,
      "name": "Costa del Sol Cities",
      "numberOfItems": metadata.cities.length,
      "itemListElement": metadata.cities.map((city, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": city.name,
        "url": `${BASE_URL}/${lang}/locations/${city.slug}`,
        "item": {
          "@type": "Place",
          "name": city.name,
          "description": `${city.guideCount} location guides available for ${city.name}, Costa del Sol`
        }
      }))
    }
  };
}

/**
 * Generate BreadcrumbList schema for the hub
 */
export function generateHubBreadcrumbSchema(lang: string): object {
  const canonicalUrl = `${BASE_URL}/${lang}/locations`;

  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${BASE_URL}/${lang}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Locations",
        "item": canonicalUrl
      }
    ]
  };
}

/**
 * Generate FAQPage schema for the hub
 */
export function generateHubFAQSchema(lang: string): object | null {
  const faqs = getLocalizedHubFAQs(lang);
  if (!faqs.length) return null;

  const canonicalUrl = `${BASE_URL}/${lang}/locations`;

  return {
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Generate hreflang tags for the hub
 */
export function generateHubHreflangTags(currentLang: string): string {
  const tags: string[] = [];

  for (const lang of SUPPORTED_LANGUAGES) {
    const url = `${BASE_URL}/${lang}/locations`;
    tags.push(`  <link rel="alternate" hreflang="${lang}" href="${url}" />`);
  }

  // x-default points to English
  tags.push(`  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/locations" />`);

  return tags.join('\n');
}

/**
 * Generate complete @graph JSON-LD for the hub page
 */
export function generateHubSchemaGraph(lang: string, metadata: LocationHubMetadata): object {
  const webPage = generateHubWebPageSchema(lang);
  const collectionPage = generateHubCollectionPageSchema(lang, metadata);
  const breadcrumb = generateHubBreadcrumbSchema(lang);
  const faq = generateHubFAQSchema(lang);

  const graph: object[] = [
    ORGANIZATION_SCHEMA,
    webPage,
    collectionPage,
    breadcrumb
  ];

  if (faq) {
    graph.push(faq);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

/**
 * Get canonical URL for the hub
 */
export function getHubCanonicalUrl(lang: string): string {
  return `${BASE_URL}/${lang}/locations`;
}

/**
 * Get og:locale for the hub
 */
export function getHubLocale(lang: string): string {
  return LOCALE_MAP[lang] || 'en_GB';
}

/**
 * Get hreflang array for React rendering in Helmet
 */
export function getHubHreflangArray(): Array<{ lang: string; href: string }> {
  const tags = SUPPORTED_LANGUAGES.map(langCode => ({
    lang: langCode,
    href: `${BASE_URL}/${langCode}/locations`
  }));
  
  // Add x-default pointing to English
  tags.push({ lang: 'x-default', href: `${BASE_URL}/en/locations` });
  
  return tags;
}
