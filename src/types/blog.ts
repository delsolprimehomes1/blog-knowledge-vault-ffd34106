// TypeScript interfaces matching the Supabase schema

export type Language = 'en' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu' | 'fi' | 'no';
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

export interface QAEntity {
  question: string;
  answer: string;
}

// Backwards compatibility alias
export type FAQEntity = QAEntity;

export interface BlogArticle {
  id: string;
  slug: string;
  language: Language;
  category: string;
  funnel_stage: FunnelStage;
  
  // Cluster Fields
  cluster_id?: string;
  is_primary: boolean;
  
  // Hreflang Fields
  hreflang_group_id?: string;
  source_language?: string;
  content_type?: string;
  
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
  
  // Q&A
  qa_entities?: QAEntity[];
  generated_qa_page_ids?: string[];
  
  // Status
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export type QAType = 'core' | 'decision';

// Backwards compatibility alias
export type FAQType = QAType;

export interface QAPage {
  id: string;
  source_article_id: string;
  language: Language;
  qa_type: QAType;
  title: string;
  slug: string;
  question_main: string;
  answer_main: string;
  related_qas: QAEntity[];
  speakable_answer: string;
  meta_title: string;
  meta_description: string;
  canonical_url?: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption?: string;
  translations: Record<string, string>;
  source_article_slug?: string;
  internal_links: InternalLink[];
  author_id?: string;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

// Backwards compatibility alias
export type FAQPage = QAPage;
