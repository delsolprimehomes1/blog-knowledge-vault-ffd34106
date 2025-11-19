// Intelligent domain analysis for auto-suggesting trust scores, categories, tiers, etc.

export interface DomainAnalysis {
  trustScore: number;
  category: string;
  tier: '1' | '2' | '3';
  language: string;
  region: string;
  sourceType: string;
  isCompetitor: boolean;
  reasoning: string;
}

const GOVERNMENT_TLDS = ['.gov', '.gov.uk', '.gob.es', '.gov.de', '.gouv.fr', '.gov.pl', '.europa.eu'];
const EDUCATION_TLDS = ['.edu', '.ac.uk', '.edu.es'];
const ORG_TLDS = ['.org'];

const LANGUAGE_MAP: Record<string, string> = {
  '.gov': 'en',
  '.gov.uk': 'en',
  '.uk': 'en',
  '.gob.es': 'es',
  '.es': 'es',
  '.gov.de': 'de',
  '.de': 'de',
  '.gouv.fr': 'fr',
  '.fr': 'fr',
  '.gov.pl': 'pl',
  '.pl': 'pl',
  '.nl': 'nl',
  '.se': 'sv',
  '.dk': 'da',
  '.hu': 'hu',
  '.europa.eu': 'eu',
  '.eu': 'eu',
};

const REGION_MAP: Record<string, string> = {
  '.gov': 'US',
  '.gov.uk': 'UK',
  '.uk': 'UK',
  '.gob.es': 'ES',
  '.es': 'ES',
  '.gov.de': 'DE',
  '.de': 'DE',
  '.gouv.fr': 'FR',
  '.fr': 'FR',
  '.gov.pl': 'PL',
  '.pl': 'PL',
  '.nl': 'NL',
  '.se': 'SE',
  '.dk': 'DK',
  '.hu': 'HU',
  '.europa.eu': 'EU',
  '.eu': 'EU',
};

// Real estate competitor keywords
const COMPETITOR_KEYWORDS = [
  'realestate', 'realtor', 'property', 'homes', 'casa', 'vivienda',
  'inmobiliaria', 'estate', 'housing', 'apartment', 'villa'
];

// Category detection patterns
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  'Government Authority': [
    /gov(ernment)?/i, /ministry/i, /department/i, /agency/i, 
    /administration/i, /ministerio/i, /administracion/i
  ],
  'Insurance Regulation': [
    /insurance/i, /eiopa/i, /naic/i, /seguros/i, /assurance/i,
    /solvency/i, /prudential/i
  ],
  'Financial Services': [
    /finance/i, /bank/i, /fca/i, /financial/i, /credit/i,
    /investment/i, /finanzas/i
  ],
  'Cybersecurity': [
    /cyber/i, /security/i, /enisa/i, /cert/i, /cisa/i
  ],
  'Data Protection': [
    /data\s*protection/i, /privacy/i, /gdpr/i, /aepd/i
  ],
  'Real Estate': [
    /real\s*estate/i, /property/i, /housing/i, /vivienda/i,
    /inmobiliaria/i, /homes/i, /casa/i
  ],
  'Academic': [
    /university/i, /college/i, /research/i, /academic/i,
    /universidad/i, /institut/i
  ],
  'Standards Organization': [
    /iso/i, /standard/i, /norm/i, /certification/i
  ],
  'News & Media': [
    /news/i, /times/i, /post/i, /bbc/i, /reuters/i, /guardian/i
  ]
};

/**
 * Analyze domain and auto-suggest metadata
 */
export function analyzeDomain(
  domain: string,
  sourceName?: string,
  exampleUrls?: string[]
): DomainAnalysis {
  const lowerDomain = domain.toLowerCase();
  const lowerSource = (sourceName || domain).toLowerCase();
  
  // Detect if it's a competitor
  const isCompetitor = COMPETITOR_KEYWORDS.some(keyword => 
    lowerDomain.includes(keyword) || lowerSource.includes(keyword)
  );

  // Detect source type and trust score
  let trustScore = 60; // Default neutral
  let sourceType = 'General';
  let tier: '1' | '2' | '3' = '3';
  let reasoning = 'Unknown domain type';

  // Government domains - Tier 1
  if (GOVERNMENT_TLDS.some(tld => lowerDomain.includes(tld))) {
    trustScore = 95;
    sourceType = 'Government';
    tier = '1';
    reasoning = 'Official government domain';
  }
  // Academic domains - Tier 1
  else if (EDUCATION_TLDS.some(tld => lowerDomain.includes(tld))) {
    trustScore = 90;
    sourceType = 'Academic';
    tier = '1';
    reasoning = 'Academic institution';
  }
  // Major news organizations - Tier 2
  else if (['bbc.', 'reuters.', 'ft.com', 'theguardian.'].some(news => lowerDomain.includes(news))) {
    trustScore = 85;
    sourceType = 'News';
    tier = '2';
    reasoning = 'Established news organization';
  }
  // Standards/NGO organizations - Tier 2
  else if (ORG_TLDS.some(tld => lowerDomain.endsWith(tld)) || 
           ['iso.org', 'w3.org', 'ietf.org'].some(org => lowerDomain.includes(org))) {
    trustScore = 80;
    sourceType = 'Standards';
    tier = '2';
    reasoning = 'Standards or NGO organization';
  }
  // Competitors - Low score
  else if (isCompetitor) {
    trustScore = 35;
    sourceType = 'Competitor';
    tier = '3';
    reasoning = 'Real estate competitor detected';
  }

  // Detect category
  let category = 'General';
  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(lowerDomain) || pattern.test(lowerSource))) {
      category = cat;
      break;
    }
  }

  // Detect language
  let language = 'en'; // Default
  for (const [tld, lang] of Object.entries(LANGUAGE_MAP)) {
    if (lowerDomain.includes(tld)) {
      language = lang;
      break;
    }
  }

  // Detect region
  let region = 'Global';
  for (const [tld, reg] of Object.entries(REGION_MAP)) {
    if (lowerDomain.includes(tld)) {
      region = reg;
      break;
    }
  }

  return {
    trustScore,
    category,
    tier,
    language,
    region,
    sourceType,
    isCompetitor,
    reasoning
  };
}

/**
 * Get color for trust score badge
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (score >= 75) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  if (score >= 40) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  return 'bg-red-500/10 text-red-600 border-red-500/20';
}

/**
 * Get icon for source type
 */
export function getSourceTypeIcon(sourceType: string): string {
  switch (sourceType) {
    case 'Government': return '🏛️';
    case 'Academic': return '🎓';
    case 'News': return '📰';
    case 'Standards': return '📋';
    case 'Competitor': return '⚠️';
    default: return '🌐';
  }
}
