// TypeScript interfaces matching the Supabase schema

export type Language = 'en' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu';
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';
export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Author {
  id: string;
  name: string;
  job_title: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  credentials: string[];
  years_experience: number;
  rating?: number;
  is_expert_verified: boolean;
  is_licensed_professional: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface InternalLink {
  text: string;
  url: string;
  title: string;
}

export interface ExternalCitation {
  text: string;
  url: string;
  source: string;
  verified?: boolean;
}

export interface FAQEntity {
  question: string;
  answer: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  language: Language;
  category: string;
  funnel_stage: FunnelStage;
  
  // SEO Fields
  headline: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  
  // Content Fields
  speakable_answer: string;
  detailed_content: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  diagram_url?: string;
  diagram_description?: string;
  
  // E-E-A-T Fields
  author_id?: string;
  reviewer_id?: string;
  date_published?: string;
  date_modified?: string;
  read_time?: number;
  
  // Linking Fields
  internal_links: InternalLink[];
  external_citations: ExternalCitation[];
  related_article_ids: string[];
  cta_article_ids: string[];
  
  // Translations
  translations: Record<string, string>;
  
  // FAQ
  faq_entities?: FAQEntity[];
  
  // Status
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}
