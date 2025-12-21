/**
 * Entity Extractor for Blog Articles
 * Extracts cities, glossary terms, and organizations for JSON-LD about/mentions properties
 */

export interface ExtractedEntity {
  type: 'Place' | 'DefinedTerm' | 'Organization' | 'Thing';
  name: string;
  description?: string;
  sameAs?: string;
  inDefinedTermSet?: string;
}

export interface EntityExtractionResult {
  about: ExtractedEntity[];
  mentions: ExtractedEntity[];
}

// Wikidata entity IDs for Costa del Sol cities and key concepts
const WIKIDATA_ENTITIES: Record<string, string> = {
  // Cities
  "Marbella": "https://www.wikidata.org/wiki/Q8337",
  "Estepona": "https://www.wikidata.org/wiki/Q477306",
  "Fuengirola": "https://www.wikidata.org/wiki/Q618947",
  "Benalmádena": "https://www.wikidata.org/wiki/Q571725",
  "Benalmadena": "https://www.wikidata.org/wiki/Q571725",
  "Mijas": "https://www.wikidata.org/wiki/Q571737",
  "Sotogrande": "https://www.wikidata.org/wiki/Q3490614",
  "Casares": "https://www.wikidata.org/wiki/Q1046949",
  "Torremolinos": "https://www.wikidata.org/wiki/Q184217",
  "Manilva": "https://www.wikidata.org/wiki/Q571730",
  "Málaga": "https://www.wikidata.org/wiki/Q8851",
  "Malaga": "https://www.wikidata.org/wiki/Q8851",
  "Costa del Sol": "https://www.wikidata.org/wiki/Q751676",
  "Nerja": "https://www.wikidata.org/wiki/Q571741",
  "Ronda": "https://www.wikidata.org/wiki/Q184053",
  "Puerto Banús": "https://www.wikidata.org/wiki/Q1139089",
  "Puerto Banus": "https://www.wikidata.org/wiki/Q1139089",
  "La Cala de Mijas": "https://www.wikidata.org/wiki/Q6466653",
  "Ojén": "https://www.wikidata.org/wiki/Q571744",
  "Ojen": "https://www.wikidata.org/wiki/Q571744",
  "Benahavís": "https://www.wikidata.org/wiki/Q571719",
  "Benahavis": "https://www.wikidata.org/wiki/Q571719",

  // Regions
  "Andalusia": "https://www.wikidata.org/wiki/Q5765",
  "Andalucía": "https://www.wikidata.org/wiki/Q5765",
  "Spain": "https://www.wikidata.org/wiki/Q29",

  // Key concepts
  "Golden Visa": "https://www.wikidata.org/wiki/Q5579119",
  "NIE": "https://www.wikidata.org/wiki/Q6955279",
  "Schengen Area": "https://www.wikidata.org/wiki/Q47906",
  
  // Organizations
  "Spanish Tax Agency": "https://www.wikidata.org/wiki/Q1442469",
  "Agencia Tributaria": "https://www.wikidata.org/wiki/Q1442469",
};

// Known organizations that may be mentioned in articles
const KNOWN_ORGANIZATIONS: Record<string, { wikidata?: string; description: string }> = {
  "Spanish Tax Agency": { wikidata: "https://www.wikidata.org/wiki/Q1442469", description: "Spain's tax administration agency" },
  "Agencia Tributaria": { wikidata: "https://www.wikidata.org/wiki/Q1442469", description: "Spain's tax administration agency" },
  "Hacienda": { description: "Spanish Treasury / Tax Office" },
  "Catastro": { description: "Spanish Property Registry" },
  "Registro de la Propiedad": { description: "Spanish Land Registry" },
  "Notario": { description: "Spanish Notary Public" },
  "Bank of Spain": { wikidata: "https://www.wikidata.org/wiki/Q806452", description: "Central bank of Spain" },
  "Banco de España": { wikidata: "https://www.wikidata.org/wiki/Q806452", description: "Central bank of Spain" },
};

// Cities to detect in content
const COSTA_DEL_SOL_CITIES = [
  "Marbella", "Estepona", "Fuengirola", "Benalmádena", "Benalmadena",
  "Mijas", "Sotogrande", "Casares", "Torremolinos", "Manilva",
  "Málaga", "Malaga", "Nerja", "Ronda", "Puerto Banús", "Puerto Banus",
  "La Cala de Mijas", "Ojén", "Ojen", "Benahavís", "Benahavis"
];

// Common glossary terms to detect (subset of most important)
const KEY_GLOSSARY_TERMS = [
  "NIE", "NIF", "TIE", "IBI", "ITP", "AJD", "IVA", "Plusvalía", "IRNR",
  "Golden Visa", "Non-Lucrative Visa", "Digital Nomad Visa",
  "Escritura", "Nota Simple", "Notario", "Arras",
  "Off-Plan", "New-Build", "Resale", "Urbanización",
  "Community Fees", "Catastral Value", "Empadronamiento",
  "LTV", "Hipoteca", "Euribor", "Rental Yield",
  "90-Day Rule", "Schengen", "Brexit"
];

// Glossary term definitions for schema
const GLOSSARY_DEFINITIONS: Record<string, string> = {
  "NIE": "Número de Identidad de Extranjero - Tax identification number for foreigners in Spain",
  "NIF": "Número de Identificación Fiscal - Spanish tax identification number",
  "TIE": "Tarjeta de Identidad de Extranjero - Physical residence card for non-EU foreigners",
  "IBI": "Impuesto sobre Bienes Inmuebles - Annual municipal property tax in Spain",
  "ITP": "Impuesto de Transmisiones Patrimoniales - Transfer tax for resale properties (7% in Andalusia)",
  "AJD": "Actos Jurídicos Documentados - Stamp duty tax (1.2% in Andalusia)",
  "IVA": "Impuesto sobre el Valor Añadido - VAT charged on new-build properties (10%)",
  "Plusvalía": "Municipal capital gains tax on increased land value",
  "IRNR": "Impuesto sobre la Renta de No Residentes - Non-resident income tax",
  "Golden Visa": "Spanish residence permit for property investors (€500,000+ investment)",
  "Non-Lucrative Visa": "Residence visa for non-EU nationals with passive income",
  "Digital Nomad Visa": "Spanish visa for remote workers employed outside Spain",
  "Escritura": "Public deed of sale signed before a notary",
  "Nota Simple": "Official extract from Property Registry showing ownership and charges",
  "Notario": "Notary Public who authenticates property transactions",
  "Arras": "Reservation deposit contract in Spain",
  "Off-Plan": "Property purchased before construction is complete",
  "New-Build": "Newly constructed property sold for the first time",
  "Resale": "Previously owned property being sold",
  "Urbanización": "Planned residential development or gated community",
  "Community Fees": "Monthly fees for shared amenities in urbanizations",
  "Catastral Value": "Official administrative property value for tax calculations",
  "Empadronamiento": "Municipal registration confirming address in Spain",
  "LTV": "Loan-to-Value ratio - Percentage of property value a bank will lend",
  "Hipoteca": "Spanish mortgage loan secured against property",
  "Euribor": "Euro Interbank Offered Rate - Benchmark for variable mortgages",
  "Rental Yield": "Annual rental income as percentage of property value",
  "90-Day Rule": "Schengen 90/180 day rule for non-EU visitors",
  "Schengen": "European area with no internal border controls",
  "Brexit": "UK's departure from the European Union"
};

/**
 * Normalize text for matching (remove accents, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extract city mentions from content
 */
export function extractCityMentions(content: string, headline: string): ExtractedEntity[] {
  const cities: ExtractedEntity[] = [];
  const combinedText = `${headline} ${content}`;
  const seenCities = new Set<string>();

  for (const city of COSTA_DEL_SOL_CITIES) {
    // Create regex for whole word matching
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    if (regex.test(combinedText)) {
      // Normalize city name to avoid duplicates (e.g., Málaga and Malaga)
      const normalizedCity = normalizeText(city);
      
      if (!seenCities.has(normalizedCity)) {
        seenCities.add(normalizedCity);
        
        const entity: ExtractedEntity = {
          type: 'Place',
          name: city,
        };
        
        if (WIKIDATA_ENTITIES[city]) {
          entity.sameAs = WIKIDATA_ENTITIES[city];
        }
        
        cities.push(entity);
      }
    }
  }

  // Also check for Costa del Sol
  if (/\bcosta del sol\b/i.test(combinedText) && !seenCities.has("costa del sol")) {
    cities.push({
      type: 'Place',
      name: 'Costa del Sol',
      description: 'Mediterranean coastline in southern Spain',
      sameAs: WIKIDATA_ENTITIES['Costa del Sol']
    });
  }

  return cities;
}

/**
 * Extract glossary term mentions from content
 */
export function extractGlossaryTerms(content: string, headline: string): ExtractedEntity[] {
  const terms: ExtractedEntity[] = [];
  const combinedText = `${headline} ${content}`;
  const seenTerms = new Set<string>();

  for (const term of KEY_GLOSSARY_TERMS) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    if (regex.test(combinedText) && !seenTerms.has(term.toLowerCase())) {
      seenTerms.add(term.toLowerCase());
      
      const entity: ExtractedEntity = {
        type: 'DefinedTerm',
        name: term,
        inDefinedTermSet: 'https://www.delsolprimehomes.com/glossary'
      };
      
      if (GLOSSARY_DEFINITIONS[term]) {
        entity.description = GLOSSARY_DEFINITIONS[term];
      }
      
      if (WIKIDATA_ENTITIES[term]) {
        entity.sameAs = WIKIDATA_ENTITIES[term];
      }
      
      terms.push(entity);
    }
  }

  return terms;
}

/**
 * Extract organization mentions from content
 */
export function extractOrganizationMentions(content: string): ExtractedEntity[] {
  const orgs: ExtractedEntity[] = [];
  const seenOrgs = new Set<string>();

  for (const [orgName, orgData] of Object.entries(KNOWN_ORGANIZATIONS)) {
    const regex = new RegExp(`\\b${orgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    if (regex.test(content) && !seenOrgs.has(normalizeText(orgName))) {
      seenOrgs.add(normalizeText(orgName));
      
      const entity: ExtractedEntity = {
        type: 'Organization',
        name: orgName,
        description: orgData.description
      };
      
      if (orgData.wikidata) {
        entity.sameAs = orgData.wikidata;
      }
      
      orgs.push(entity);
    }
  }

  return orgs;
}

/**
 * Get category as a Thing entity
 */
export function getCategoryEntity(category: string): ExtractedEntity {
  return {
    type: 'Thing',
    name: category,
    sameAs: `https://www.delsolprimehomes.com/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`
  };
}

/**
 * Main extraction function - extracts all entities from article content
 * Returns structured about/mentions for JSON-LD
 */
export function extractEntitiesFromArticle(
  headline: string,
  content: string,
  category: string
): EntityExtractionResult {
  // Strip HTML tags for text analysis
  const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  // Extract all entity types
  const cities = extractCityMentions(plainContent, headline);
  const glossaryTerms = extractGlossaryTerms(plainContent, headline);
  const organizations = extractOrganizationMentions(plainContent);
  
  // Determine primary subject (about) - category + main city from headline
  const about: ExtractedEntity[] = [];
  
  // Add category as primary subject
  about.push(getCategoryEntity(category));
  
  // Check if headline contains a city - that's the primary city
  const headlineCities = extractCityMentions('', headline);
  if (headlineCities.length > 0) {
    about.push(headlineCities[0]);
  }
  
  // Add Costa del Sol if mentioned prominently
  const costaDelSol = cities.find(c => c.name === 'Costa del Sol');
  if (costaDelSol && !about.some(e => e.name === 'Costa del Sol')) {
    about.push(costaDelSol);
  }
  
  // Mentions are secondary references (exclude what's in about)
  const aboutNames = new Set(about.map(e => normalizeText(e.name)));
  
  const mentions: ExtractedEntity[] = [
    ...cities.filter(c => !aboutNames.has(normalizeText(c.name))),
    ...glossaryTerms,
    ...organizations
  ];
  
  // Limit mentions to avoid bloating the schema (max 15)
  const limitedMentions = mentions.slice(0, 15);
  
  return {
    about,
    mentions: limitedMentions
  };
}

/**
 * Convert extracted entities to JSON-LD format
 */
export function entitiesToJsonLd(entities: ExtractedEntity[]): any[] {
  return entities.map(entity => {
    const jsonLd: any = {
      "@type": entity.type,
      "name": entity.name
    };
    
    if (entity.description) {
      jsonLd.description = entity.description;
    }
    
    if (entity.sameAs) {
      jsonLd.sameAs = entity.sameAs;
    }
    
    if (entity.inDefinedTermSet) {
      jsonLd.inDefinedTermSet = entity.inDefinedTermSet;
    }
    
    return jsonLd;
  });
}
