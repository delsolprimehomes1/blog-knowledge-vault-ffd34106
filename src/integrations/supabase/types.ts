export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      about_page_content: {
        Row: {
          canonical_url: string | null
          citations: Json | null
          client_satisfaction_percent: number | null
          created_at: string | null
          credentials: Json | null
          faq_entities: Json | null
          founders: Json | null
          hero_headline: string
          hero_subheadline: string
          id: string
          language: string | null
          meta_description: string
          meta_title: string
          mission_statement: string
          our_story_content: string
          properties_sold: number | null
          slug: string | null
          speakable_summary: string
          updated_at: string | null
          why_choose_us_content: string
          years_in_business: number | null
        }
        Insert: {
          canonical_url?: string | null
          citations?: Json | null
          client_satisfaction_percent?: number | null
          created_at?: string | null
          credentials?: Json | null
          faq_entities?: Json | null
          founders?: Json | null
          hero_headline: string
          hero_subheadline: string
          id?: string
          language?: string | null
          meta_description: string
          meta_title: string
          mission_statement: string
          our_story_content: string
          properties_sold?: number | null
          slug?: string | null
          speakable_summary: string
          updated_at?: string | null
          why_choose_us_content: string
          years_in_business?: number | null
        }
        Update: {
          canonical_url?: string | null
          citations?: Json | null
          client_satisfaction_percent?: number | null
          created_at?: string | null
          credentials?: Json | null
          faq_entities?: Json | null
          founders?: Json | null
          hero_headline?: string
          hero_subheadline?: string
          id?: string
          language?: string | null
          meta_description?: string
          meta_title?: string
          mission_statement?: string
          our_story_content?: string
          properties_sold?: number | null
          slug?: string | null
          speakable_summary?: string
          updated_at?: string | null
          why_choose_us_content?: string
          years_in_business?: number | null
        }
        Relationships: []
      }
      admin_email_whitelist: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      approved_domains: {
        Row: {
          category: string
          created_at: string | null
          domain: string
          id: string
          is_allowed: boolean | null
          is_international: boolean | null
          language: string | null
          notes: string | null
          region: string | null
          source_type: string | null
          tier: string | null
          trust_score: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          domain: string
          id?: string
          is_allowed?: boolean | null
          is_international?: boolean | null
          language?: string | null
          notes?: string | null
          region?: string | null
          source_type?: string | null
          tier?: string | null
          trust_score: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_allowed?: boolean | null
          is_international?: boolean | null
          language?: string | null
          notes?: string | null
          region?: string | null
          source_type?: string | null
          tier?: string | null
          trust_score?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      article_image_issues: {
        Row: {
          analyzed_at: string | null
          article_id: string
          created_at: string | null
          details: Json | null
          id: string
          issue_type: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          analyzed_at?: string | null
          article_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          analyzed_at?: string | null
          article_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_image_issues_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_image_issues_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      article_link_patterns: {
        Row: {
          article_id: string
          compliance_score: number | null
          has_parent_category_link: boolean | null
          has_related_article_link: boolean | null
          has_service_link: boolean | null
          last_updated: string | null
          last_validated_by: string | null
          parent_category_url: string | null
          related_article_urls: string[] | null
          service_link_url: string | null
          total_external_links: number | null
          total_internal_links: number | null
        }
        Insert: {
          article_id: string
          compliance_score?: number | null
          has_parent_category_link?: boolean | null
          has_related_article_link?: boolean | null
          has_service_link?: boolean | null
          last_updated?: string | null
          last_validated_by?: string | null
          parent_category_url?: string | null
          related_article_urls?: string[] | null
          service_link_url?: string | null
          total_external_links?: number | null
          total_internal_links?: number | null
        }
        Update: {
          article_id?: string
          compliance_score?: number | null
          has_parent_category_link?: boolean | null
          has_related_article_link?: boolean | null
          has_service_link?: boolean | null
          last_updated?: string | null
          last_validated_by?: string | null
          parent_category_url?: string | null
          related_article_urls?: string[] | null
          service_link_url?: string | null
          total_external_links?: number | null
          total_internal_links?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "article_link_patterns_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_link_patterns_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          article_id: string
          can_rollback: boolean | null
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          previous_citations: Json | null
          previous_content: string
          replacement_id: string | null
          revision_type: string
          rollback_expires_at: string | null
        }
        Insert: {
          article_id: string
          can_rollback?: boolean | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          previous_citations?: Json | null
          previous_content: string
          replacement_id?: string | null
          revision_type: string
          rollback_expires_at?: string | null
        }
        Update: {
          article_id?: string
          can_rollback?: boolean | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          previous_citations?: Json | null
          previous_content?: string
          replacement_id?: string | null
          revision_type?: string
          rollback_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_revisions_replacement_id_fkey"
            columns: ["replacement_id"]
            isOneToOne: false
            referencedRelation: "dead_link_replacements"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string
          created_at: string
          credentials: string[] | null
          id: string
          is_expert_verified: boolean
          is_licensed_professional: boolean
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          rating: number | null
          years_experience: number
        }
        Insert: {
          bio: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          is_expert_verified?: boolean
          is_licensed_professional?: boolean
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          rating?: number | null
          years_experience: number
        }
        Update: {
          bio?: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          is_expert_verified?: boolean
          is_licensed_professional?: boolean
          job_title?: string
          linkedin_url?: string
          name?: string
          photo_url?: string
          rating?: number | null
          years_experience?: number
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          added_at: string | null
          category: string
          domain: string
          id: string
          is_blocked: boolean | null
          reason: string
        }
        Insert: {
          added_at?: string | null
          category: string
          domain: string
          id?: string
          is_blocked?: boolean | null
          reason: string
        }
        Update: {
          added_at?: string | null
          category?: string
          domain?: string
          id?: string
          is_blocked?: boolean | null
          reason?: string
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author_bio_localized: string | null
          author_id: string | null
          author_photo_context: string | null
          canonical_url: string | null
          category: string
          citation_failure_reason: string | null
          citation_health_score: number | null
          citation_status: string | null
          cluster_id: string | null
          cluster_number: number | null
          cluster_theme: string | null
          content_type: string | null
          created_at: string
          cta_article_ids: string[] | null
          date_modified: string | null
          date_published: string | null
          decision_snapshot: Json | null
          detailed_content: string
          diagram_alt: string | null
          diagram_caption: string | null
          diagram_description: string | null
          diagram_url: string | null
          expert_insight: string | null
          external_citations: Json | null
          featured_image_alt: string
          featured_image_caption: string | null
          featured_image_url: string
          funnel_stage: string
          generated_qa_page_ids: string[] | null
          has_dead_citations: boolean | null
          headline: string
          hreflang_group_id: string | null
          id: string
          internal_links: Json | null
          is_primary: boolean
          is_redirect: boolean | null
          language: string
          last_citation_check_at: string | null
          last_edited_by: string | null
          last_link_validation: string | null
          link_depth: number | null
          meta_description: string
          meta_title: string
          published_by: string | null
          qa_entities: Json | null
          read_time: number | null
          redirect_to: string | null
          related_article_ids: string[] | null
          related_cluster_articles: Json | null
          reviewer_id: string | null
          slug: string
          source_language: string | null
          speakable_answer: string
          status: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          author_bio_localized?: string | null
          author_id?: string | null
          author_photo_context?: string | null
          canonical_url?: string | null
          category: string
          citation_failure_reason?: string | null
          citation_health_score?: number | null
          citation_status?: string | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          content_type?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          decision_snapshot?: Json | null
          detailed_content: string
          diagram_alt?: string | null
          diagram_caption?: string | null
          diagram_description?: string | null
          diagram_url?: string | null
          expert_insight?: string | null
          external_citations?: Json | null
          featured_image_alt: string
          featured_image_caption?: string | null
          featured_image_url: string
          funnel_stage: string
          generated_qa_page_ids?: string[] | null
          has_dead_citations?: boolean | null
          headline: string
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_primary?: boolean
          is_redirect?: boolean | null
          language: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          last_link_validation?: string | null
          link_depth?: number | null
          meta_description: string
          meta_title: string
          published_by?: string | null
          qa_entities?: Json | null
          read_time?: number | null
          redirect_to?: string | null
          related_article_ids?: string[] | null
          related_cluster_articles?: Json | null
          reviewer_id?: string | null
          slug: string
          source_language?: string | null
          speakable_answer: string
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          author_bio_localized?: string | null
          author_id?: string | null
          author_photo_context?: string | null
          canonical_url?: string | null
          category?: string
          citation_failure_reason?: string | null
          citation_health_score?: number | null
          citation_status?: string | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          content_type?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          decision_snapshot?: Json | null
          detailed_content?: string
          diagram_alt?: string | null
          diagram_caption?: string | null
          diagram_description?: string | null
          diagram_url?: string | null
          expert_insight?: string | null
          external_citations?: Json | null
          featured_image_alt?: string
          featured_image_caption?: string | null
          featured_image_url?: string
          funnel_stage?: string
          generated_qa_page_ids?: string[] | null
          has_dead_citations?: boolean | null
          headline?: string
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_primary?: boolean
          is_redirect?: boolean | null
          language?: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          last_link_validation?: string | null
          link_depth?: number | null
          meta_description?: string
          meta_title?: string
          published_by?: string | null
          qa_entities?: Json | null
          read_time?: number | null
          redirect_to?: string | null
          related_article_ids?: string[] | null
          related_cluster_articles?: Json | null
          reviewer_id?: string | null
          slug?: string
          source_language?: string | null
          speakable_answer?: string
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      broken_link_scans: {
        Row: {
          broken_links_found: number | null
          content_types_scanned: string[] | null
          created_at: string | null
          fixed_links: number | null
          id: string
          scan_completed_at: string | null
          scan_started_at: string | null
          scan_type: string | null
          total_links_checked: number | null
        }
        Insert: {
          broken_links_found?: number | null
          content_types_scanned?: string[] | null
          created_at?: string | null
          fixed_links?: number | null
          id?: string
          scan_completed_at?: string | null
          scan_started_at?: string | null
          scan_type?: string | null
          total_links_checked?: number | null
        }
        Update: {
          broken_links_found?: number | null
          content_types_scanned?: string[] | null
          created_at?: string | null
          fixed_links?: number | null
          id?: string
          scan_completed_at?: string | null
          scan_started_at?: string | null
          scan_type?: string | null
          total_links_checked?: number | null
        }
        Relationships: []
      }
      broken_links: {
        Row: {
          broken_url: string
          created_at: string | null
          fix_action: string | null
          fixed: boolean | null
          fixed_at: string | null
          id: string
          link_index: number | null
          link_location: string | null
          link_text: string | null
          scan_id: string | null
          source_id: string
          source_language: string
          source_slug: string
          source_table: string
          target_status: string | null
        }
        Insert: {
          broken_url: string
          created_at?: string | null
          fix_action?: string | null
          fixed?: boolean | null
          fixed_at?: string | null
          id?: string
          link_index?: number | null
          link_location?: string | null
          link_text?: string | null
          scan_id?: string | null
          source_id: string
          source_language: string
          source_slug: string
          source_table: string
          target_status?: string | null
        }
        Update: {
          broken_url?: string
          created_at?: string | null
          fix_action?: string | null
          fixed?: boolean | null
          fixed_at?: string | null
          id?: string
          link_index?: number | null
          link_location?: string | null
          link_text?: string | null
          scan_id?: string | null
          source_id?: string
          source_language?: string
          source_slug?: string
          source_table?: string
          target_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broken_links_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "broken_link_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_recitation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          error_message: string | null
          id: string
          progress_current: number | null
          progress_total: number | null
          started_at: string | null
          status: string
          success_count: number | null
          total_new_citations: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          progress_current?: number | null
          progress_total?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_new_citations?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          progress_current?: number | null
          progress_total?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_new_citations?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          area: string | null
          article_slug: string | null
          budget_range: string | null
          conversation_transcript: Json | null
          created_at: string
          id: string
          preferred_language: string | null
          property_type: string | null
          user_email: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          area?: string | null
          article_slug?: string | null
          budget_range?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          preferred_language?: string | null
          property_type?: string | null
          user_email?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          area?: string | null
          article_slug?: string | null
          budget_range?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          preferred_language?: string | null
          property_type?: string | null
          user_email?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      citation_cleanup_audit_log: {
        Row: {
          action_taken: string | null
          article_id: string | null
          article_slug: string | null
          citation_url: string | null
          competitor_domain: string | null
          created_at: string | null
          field_name: string | null
          id: string
          match_type: string | null
          scan_type: string
        }
        Insert: {
          action_taken?: string | null
          article_id?: string | null
          article_slug?: string | null
          citation_url?: string | null
          competitor_domain?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          match_type?: string | null
          scan_type: string
        }
        Update: {
          action_taken?: string | null
          article_id?: string | null
          article_slug?: string | null
          citation_url?: string | null
          competitor_domain?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          match_type?: string | null
          scan_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "citation_cleanup_audit_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_cleanup_audit_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_compliance_alerts: {
        Row: {
          alert_type: string
          article_id: string | null
          article_title: string | null
          auto_suggested_replacement: string | null
          citation_url: string
          created_at: string
          detected_at: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          article_id?: string | null
          article_title?: string | null
          auto_suggested_replacement?: string | null
          citation_url: string
          created_at?: string
          detected_at?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          article_id?: string | null
          article_title?: string | null
          auto_suggested_replacement?: string | null
          citation_url?: string
          created_at?: string
          detected_at?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citation_compliance_alerts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_compliance_alerts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_diversity_alerts: {
        Row: {
          created_at: string | null
          current_uses: number
          detected_at: string | null
          domain: string
          id: string
          resolved: boolean | null
          threshold_reached: string
        }
        Insert: {
          created_at?: string | null
          current_uses: number
          detected_at?: string | null
          domain: string
          id?: string
          resolved?: boolean | null
          threshold_reached: string
        }
        Update: {
          created_at?: string | null
          current_uses?: number
          detected_at?: string | null
          domain?: string
          id?: string
          resolved?: boolean | null
          threshold_reached?: string
        }
        Relationships: []
      }
      citation_hygiene_reports: {
        Row: {
          articles_cleaned: number | null
          articles_with_violations: number
          auto_replacement_triggered: boolean | null
          banned_citations_found: number
          clean_replacements_applied: number | null
          compliance_score: number
          created_at: string
          detailed_violations: Json | null
          id: string
          next_scan_scheduled: string | null
          scan_date: string
          scan_duration_ms: number | null
          top_offenders: Json | null
          total_articles_scanned: number
          total_citations_scanned: number
          violations_by_domain: Json | null
          violations_by_language: Json | null
        }
        Insert: {
          articles_cleaned?: number | null
          articles_with_violations: number
          auto_replacement_triggered?: boolean | null
          banned_citations_found: number
          clean_replacements_applied?: number | null
          compliance_score: number
          created_at?: string
          detailed_violations?: Json | null
          id?: string
          next_scan_scheduled?: string | null
          scan_date?: string
          scan_duration_ms?: number | null
          top_offenders?: Json | null
          total_articles_scanned: number
          total_citations_scanned: number
          violations_by_domain?: Json | null
          violations_by_language?: Json | null
        }
        Update: {
          articles_cleaned?: number | null
          articles_with_violations?: number
          auto_replacement_triggered?: boolean | null
          banned_citations_found?: number
          clean_replacements_applied?: number | null
          compliance_score?: number
          created_at?: string
          detailed_violations?: Json | null
          id?: string
          next_scan_scheduled?: string | null
          scan_date?: string
          scan_duration_ms?: number | null
          top_offenders?: Json | null
          total_articles_scanned?: number
          total_citations_scanned?: number
          violations_by_domain?: Json | null
          violations_by_language?: Json | null
        }
        Relationships: []
      }
      citation_quality_scores: {
        Row: {
          authority_score: number | null
          citation_id: string | null
          created_at: string | null
          diversity_score: number | null
          final_score: number | null
          id: string
          recency_score: number | null
          relevance_score: number | null
          updated_at: string | null
        }
        Insert: {
          authority_score?: number | null
          citation_id?: string | null
          created_at?: string | null
          diversity_score?: number | null
          final_score?: number | null
          id?: string
          recency_score?: number | null
          relevance_score?: number | null
          updated_at?: string | null
        }
        Update: {
          authority_score?: number | null
          citation_id?: string | null
          created_at?: string | null
          diversity_score?: number | null
          final_score?: number | null
          id?: string
          recency_score?: number | null
          relevance_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_quality_scores_citation_id_fkey"
            columns: ["citation_id"]
            isOneToOne: false
            referencedRelation: "citation_usage_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_replacement_chunks: {
        Row: {
          auto_applied_count: number | null
          blocked_competitor_count: number | null
          chunk_number: number
          chunk_size: number
          citations: Json
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          manual_review_count: number | null
          parent_job_id: string | null
          progress_current: number | null
          progress_total: number
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          auto_applied_count?: number | null
          blocked_competitor_count?: number | null
          chunk_number: number
          chunk_size: number
          citations: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          manual_review_count?: number | null
          parent_job_id?: string | null
          progress_current?: number | null
          progress_total: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          auto_applied_count?: number | null
          blocked_competitor_count?: number | null
          chunk_number?: number
          chunk_size?: number
          citations?: Json
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          manual_review_count?: number | null
          parent_job_id?: string | null
          progress_current?: number | null
          progress_total?: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_replacement_chunks_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "citation_replacement_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_replacement_jobs: {
        Row: {
          articles_processed: number | null
          auto_applied_count: number | null
          blocked_competitor_count: number | null
          chunk_size: number | null
          completed_at: string | null
          completed_chunks: number | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          failed_chunks: number | null
          failed_count: number | null
          id: string
          manual_review_count: number | null
          progress_current: number | null
          progress_total: number | null
          results: Json | null
          started_at: string | null
          status: string
          total_chunks: number | null
          updated_at: string | null
        }
        Insert: {
          articles_processed?: number | null
          auto_applied_count?: number | null
          blocked_competitor_count?: number | null
          chunk_size?: number | null
          completed_at?: string | null
          completed_chunks?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          failed_chunks?: number | null
          failed_count?: number | null
          id?: string
          manual_review_count?: number | null
          progress_current?: number | null
          progress_total?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Update: {
          articles_processed?: number | null
          auto_applied_count?: number | null
          blocked_competitor_count?: number | null
          chunk_size?: number | null
          completed_at?: string | null
          completed_chunks?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          failed_chunks?: number | null
          failed_count?: number | null
          id?: string
          manual_review_count?: number | null
          progress_current?: number | null
          progress_total?: number | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      citation_scoring_log: {
        Row: {
          article_id: string | null
          citation_url: string
          domain: string
          final_score: number | null
          id: string
          novelty_boost: number | null
          overuse_penalty: number | null
          relevance_score: number | null
          suggested_at: string | null
          trust_score: number | null
          was_selected: boolean | null
        }
        Insert: {
          article_id?: string | null
          citation_url: string
          domain: string
          final_score?: number | null
          id?: string
          novelty_boost?: number | null
          overuse_penalty?: number | null
          relevance_score?: number | null
          suggested_at?: string | null
          trust_score?: number | null
          was_selected?: boolean | null
        }
        Update: {
          article_id?: string | null
          citation_url?: string
          domain?: string
          final_score?: number | null
          id?: string
          novelty_boost?: number | null
          overuse_penalty?: number | null
          relevance_score?: number | null
          suggested_at?: string | null
          trust_score?: number | null
          was_selected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_scoring_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_scoring_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_usage_tracking: {
        Row: {
          anchor_text: string | null
          article_id: string | null
          citation_domain: string | null
          citation_source: string | null
          citation_url: string
          confidence_score: number | null
          context_paragraph_index: number | null
          created_at: string | null
          first_added_at: string | null
          id: string
          insertion_location: number | null
          is_active: boolean | null
          last_verified_at: string | null
          position_in_article: number | null
          suggested_anchor: string | null
          target_sentence: string | null
          updated_at: string | null
        }
        Insert: {
          anchor_text?: string | null
          article_id?: string | null
          citation_domain?: string | null
          citation_source?: string | null
          citation_url: string
          confidence_score?: number | null
          context_paragraph_index?: number | null
          created_at?: string | null
          first_added_at?: string | null
          id?: string
          insertion_location?: number | null
          is_active?: boolean | null
          last_verified_at?: string | null
          position_in_article?: number | null
          suggested_anchor?: string | null
          target_sentence?: string | null
          updated_at?: string | null
        }
        Update: {
          anchor_text?: string | null
          article_id?: string | null
          citation_domain?: string | null
          citation_source?: string | null
          citation_url?: string
          confidence_score?: number | null
          context_paragraph_index?: number | null
          created_at?: string | null
          first_added_at?: string | null
          id?: string
          insertion_location?: number | null
          is_active?: boolean | null
          last_verified_at?: string | null
          position_in_article?: number | null
          suggested_anchor?: string | null
          target_sentence?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_usage_tracking_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_usage_tracking_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      city_brochures: {
        Row: {
          ai_gallery_images: Json | null
          ai_hero_image: string | null
          content_generated: boolean | null
          created_at: string | null
          description: string | null
          description_i18n: Json | null
          features: Json | null
          features_i18n: Json | null
          gallery_images: Json | null
          gallery_images_i18n: Json | null
          generation_status: string | null
          hero_headline: string | null
          hero_headline_i18n: Json | null
          hero_image: string | null
          hero_subtitle: string | null
          hero_subtitle_i18n: Json | null
          hero_video_url: string | null
          id: string
          images_generated: boolean | null
          investment_stats: Json | null
          is_published: boolean | null
          last_generated_at: string | null
          lifestyle_features: Json | null
          meta_description: string | null
          meta_description_i18n: Json | null
          meta_title: string | null
          meta_title_i18n: Json | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          ai_gallery_images?: Json | null
          ai_hero_image?: string | null
          content_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          features?: Json | null
          features_i18n?: Json | null
          gallery_images?: Json | null
          gallery_images_i18n?: Json | null
          generation_status?: string | null
          hero_headline?: string | null
          hero_headline_i18n?: Json | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_subtitle_i18n?: Json | null
          hero_video_url?: string | null
          id?: string
          images_generated?: boolean | null
          investment_stats?: Json | null
          is_published?: boolean | null
          last_generated_at?: string | null
          lifestyle_features?: Json | null
          meta_description?: string | null
          meta_description_i18n?: Json | null
          meta_title?: string | null
          meta_title_i18n?: Json | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          ai_gallery_images?: Json | null
          ai_hero_image?: string | null
          content_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          features?: Json | null
          features_i18n?: Json | null
          gallery_images?: Json | null
          gallery_images_i18n?: Json | null
          generation_status?: string | null
          hero_headline?: string | null
          hero_headline_i18n?: Json | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_subtitle_i18n?: Json | null
          hero_video_url?: string | null
          id?: string
          images_generated?: boolean | null
          investment_stats?: Json | null
          is_published?: boolean | null
          last_generated_at?: string | null
          lifestyle_features?: Json | null
          meta_description?: string | null
          meta_description_i18n?: Json | null
          meta_title?: string | null
          meta_title_i18n?: Json | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cluster_article_chunks: {
        Row: {
          article_data: Json | null
          article_plan: Json
          chunk_number: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          parent_job_id: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          article_data?: Json | null
          article_plan: Json
          chunk_number: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          parent_job_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          article_data?: Json | null
          article_plan?: Json
          chunk_number?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          parent_job_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_article_chunks_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "cluster_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_completion_progress: {
        Row: {
          articles_completed: number | null
          cluster_id: string
          cluster_theme: string | null
          completed_at: string | null
          english_articles: number | null
          error_count: number | null
          languages_status: Json | null
          last_updated: string | null
          priority_score: number | null
          started_at: string | null
          status: string
          tier: string | null
          total_articles_needed: number | null
          translations_completed: number | null
        }
        Insert: {
          articles_completed?: number | null
          cluster_id: string
          cluster_theme?: string | null
          completed_at?: string | null
          english_articles?: number | null
          error_count?: number | null
          languages_status?: Json | null
          last_updated?: string | null
          priority_score?: number | null
          started_at?: string | null
          status?: string
          tier?: string | null
          total_articles_needed?: number | null
          translations_completed?: number | null
        }
        Update: {
          articles_completed?: number | null
          cluster_id?: string
          cluster_theme?: string | null
          completed_at?: string | null
          english_articles?: number | null
          error_count?: number | null
          languages_status?: Json | null
          last_updated?: string | null
          priority_score?: number | null
          started_at?: string | null
          status?: string
          tier?: string | null
          total_articles_needed?: number | null
          translations_completed?: number | null
        }
        Relationships: []
      }
      cluster_generations: {
        Row: {
          article_structure: Json | null
          articles: Json | null
          articles_per_cluster: number | null
          cluster_count: number | null
          cluster_focus_areas: Json | null
          completed_languages: string[] | null
          completion_completed_at: string | null
          completion_note: string | null
          completion_started_at: string | null
          completion_status: string | null
          created_at: string | null
          current_language_index: number | null
          english_articles_count: number | null
          error: string | null
          id: string
          is_multilingual: boolean | null
          language: string
          language_status: Json | null
          languages_queue: string[] | null
          primary_keyword: string
          progress: Json | null
          started_at: string | null
          status: string
          target_audience: string
          timeout_at: string | null
          topic: string
          total_articles: number | null
          translated_articles_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          article_structure?: Json | null
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          completed_languages?: string[] | null
          completion_completed_at?: string | null
          completion_note?: string | null
          completion_started_at?: string | null
          completion_status?: string | null
          created_at?: string | null
          current_language_index?: number | null
          english_articles_count?: number | null
          error?: string | null
          id?: string
          is_multilingual?: boolean | null
          language: string
          language_status?: Json | null
          languages_queue?: string[] | null
          primary_keyword: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience: string
          timeout_at?: string | null
          topic: string
          total_articles?: number | null
          translated_articles_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          article_structure?: Json | null
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          completed_languages?: string[] | null
          completion_completed_at?: string | null
          completion_note?: string | null
          completion_started_at?: string | null
          completion_status?: string | null
          created_at?: string | null
          current_language_index?: number | null
          english_articles_count?: number | null
          error?: string | null
          id?: string
          is_multilingual?: boolean | null
          language?: string
          language_status?: Json | null
          languages_queue?: string[] | null
          primary_keyword?: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience?: string
          timeout_at?: string | null
          topic?: string
          total_articles?: number | null
          translated_articles_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cluster_translation_queue: {
        Row: {
          cluster_id: string
          completed_at: string | null
          created_article_id: string | null
          created_at: string | null
          english_article_id: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          priority: number | null
          retry_count: number | null
          started_at: string | null
          status: string
          target_language: string
        }
        Insert: {
          cluster_id: string
          completed_at?: string | null
          created_article_id?: string | null
          created_at?: string | null
          english_article_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          target_language: string
        }
        Update: {
          cluster_id?: string
          completed_at?: string | null
          created_article_id?: string | null
          created_at?: string | null
          english_article_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_translation_queue_created_article_id_fkey"
            columns: ["created_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_translation_queue_created_article_id_fkey"
            columns: ["created_article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_translation_queue_english_article_id_fkey"
            columns: ["english_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_translation_queue_english_article_id_fkey"
            columns: ["english_article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_pages: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category: string | null
          comparison_topic: string
          content_type: string | null
          created_at: string | null
          date_modified: string | null
          date_published: string | null
          external_citations: Json | null
          featured_image_alt: string | null
          featured_image_caption: string | null
          featured_image_url: string | null
          final_verdict: string | null
          headline: string
          hreflang_group_id: string | null
          id: string
          internal_links: Json | null
          is_redirect: boolean | null
          language: string | null
          meta_description: string
          meta_title: string
          niche: string | null
          option_a: string
          option_a_overview: string | null
          option_b: string
          option_b_overview: string | null
          qa_entities: Json | null
          quick_comparison_table: Json | null
          redirect_to: string | null
          reviewer_id: string | null
          side_by_side_breakdown: string | null
          slug: string
          source_language: string | null
          speakable_answer: string
          status: string | null
          target_audience: string | null
          translations: Json | null
          updated_at: string | null
          use_case_scenarios: string | null
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          comparison_topic: string
          content_type?: string | null
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          external_citations?: Json | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_url?: string | null
          final_verdict?: string | null
          headline: string
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language?: string | null
          meta_description: string
          meta_title: string
          niche?: string | null
          option_a: string
          option_a_overview?: string | null
          option_b: string
          option_b_overview?: string | null
          qa_entities?: Json | null
          quick_comparison_table?: Json | null
          redirect_to?: string | null
          reviewer_id?: string | null
          side_by_side_breakdown?: string | null
          slug: string
          source_language?: string | null
          speakable_answer: string
          status?: string | null
          target_audience?: string | null
          translations?: Json | null
          updated_at?: string | null
          use_case_scenarios?: string | null
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          comparison_topic?: string
          content_type?: string | null
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          external_citations?: Json | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_url?: string | null
          final_verdict?: string | null
          headline?: string
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language?: string | null
          meta_description?: string
          meta_title?: string
          niche?: string | null
          option_a?: string
          option_a_overview?: string | null
          option_b?: string
          option_b_overview?: string | null
          qa_entities?: Json | null
          quick_comparison_table?: Json | null
          redirect_to?: string | null
          reviewer_id?: string | null
          side_by_side_breakdown?: string | null
          slug?: string
          source_language?: string | null
          speakable_answer?: string
          status?: string | null
          target_audience?: string | null
          translations?: Json | null
          updated_at?: string | null
          use_case_scenarios?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparison_pages_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      content_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      content_updates: {
        Row: {
          article_id: string
          created_at: string
          id: string
          new_date_modified: string
          previous_date_modified: string | null
          update_notes: string | null
          update_type: string
          updated_by: string | null
          updated_fields: Json | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          new_date_modified?: string
          previous_date_modified?: string | null
          update_notes?: string | null
          update_type: string
          updated_by?: string | null
          updated_fields?: Json | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          new_date_modified?: string
          previous_date_modified?: string | null
          update_notes?: string | null
          update_type?: string
          updated_by?: string | null
          updated_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_updates_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_updates_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          agent_id: string
          auto_status_update: string | null
          call_duration: number | null
          callback_completed: boolean | null
          callback_datetime: string | null
          callback_notes: string | null
          callback_requested: boolean | null
          created_at: string | null
          id: string
          interest_level: string | null
          lead_id: string
          notes: string
          outcome: string | null
          scheduled_for: string | null
          sentiment_score: number | null
          subject: string | null
          whatsapp_template_used: string | null
        }
        Insert: {
          activity_type: string
          agent_id: string
          auto_status_update?: string | null
          call_duration?: number | null
          callback_completed?: boolean | null
          callback_datetime?: string | null
          callback_notes?: string | null
          callback_requested?: boolean | null
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id: string
          notes: string
          outcome?: string | null
          scheduled_for?: string | null
          sentiment_score?: number | null
          subject?: string | null
          whatsapp_template_used?: string | null
        }
        Update: {
          activity_type?: string
          agent_id?: string
          auto_status_update?: string | null
          call_duration?: number | null
          callback_completed?: boolean | null
          callback_datetime?: string | null
          callback_notes?: string | null
          callback_requested?: boolean | null
          created_at?: string | null
          id?: string
          interest_level?: string | null
          lead_id?: string
          notes?: string
          outcome?: string | null
          scheduled_for?: string | null
          sentiment_score?: number | null
          subject?: string | null
          whatsapp_template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_agents: {
        Row: {
          accepts_new_leads: boolean | null
          created_at: string | null
          current_lead_count: number | null
          email: string
          email_notifications: boolean | null
          first_name: string
          id: string
          is_active: boolean | null
          languages: string[]
          last_login: string | null
          last_name: string
          max_active_leads: number | null
          phone: string | null
          role: string
          slack_notifications: boolean | null
          timezone: string | null
          updated_at: string | null
          urgent_emails_enabled: boolean | null
        }
        Insert: {
          accepts_new_leads?: boolean | null
          created_at?: string | null
          current_lead_count?: number | null
          email: string
          email_notifications?: boolean | null
          first_name: string
          id: string
          is_active?: boolean | null
          languages?: string[]
          last_login?: string | null
          last_name: string
          max_active_leads?: number | null
          phone?: string | null
          role?: string
          slack_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          urgent_emails_enabled?: boolean | null
        }
        Update: {
          accepts_new_leads?: boolean | null
          created_at?: string | null
          current_lead_count?: number | null
          email?: string
          email_notifications?: boolean | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          languages?: string[]
          last_login?: string | null
          last_name?: string
          max_active_leads?: number | null
          phone?: string | null
          role?: string
          slack_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          urgent_emails_enabled?: boolean | null
        }
        Relationships: []
      }
      crm_email_logs: {
        Row: {
          agent_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          recipient_email: string
          recipient_name: string | null
          reminder_id: string | null
          resend_message_id: string | null
          sent_at: string
          status: string
          subject: string
          template_type: string
          trigger_reason: string | null
          triggered_by: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          reminder_id?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          template_type: string
          trigger_reason?: string | null
          triggered_by: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          reminder_id?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_type?: string
          trigger_reason?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "crm_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_notes: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          lead_id: string
          note_text: string
          note_type: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id: string
          note_text: string
          note_type?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          lead_id?: string
          note_text?: string
          note_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          archived_reason: string | null
          assigned_agent_id: string | null
          assigned_at: string | null
          assignment_method: string | null
          bedrooms_desired: string | null
          breach_timestamp: string | null
          budget_range: string | null
          city_name: string | null
          city_slug: string | null
          claim_broadcast_sent: boolean | null
          claim_window_expires_at: string | null
          claimed_by: string | null
          contact_complete: boolean | null
          conversation_duration: string | null
          conversation_transcript: Json | null
          country_prefix: string | null
          created_at: string | null
          current_lead_score: number | null
          current_round: number | null
          days_since_last_contact: number | null
          email: string | null
          exit_point: string | null
          first_action_completed: boolean | null
          first_contact_at: string | null
          first_name: string
          full_phone: string | null
          id: string
          initial_lead_score: number | null
          intake_complete: boolean | null
          interest: string | null
          is_night_held: boolean | null
          language: string
          last_contact_at: string | null
          last_name: string
          lead_claimed: boolean | null
          lead_priority: string | null
          lead_segment: string | null
          lead_source: string
          lead_source_detail: string
          lead_status: string | null
          location_preference: string[] | null
          message: string | null
          page_slug: string | null
          page_title: string | null
          page_type: string | null
          page_url: string
          phone_number: string | null
          property_price: string | null
          property_purpose: string | null
          property_ref: string | null
          property_type: string[] | null
          qa_pairs: Json | null
          questions_answered: number | null
          referrer: string | null
          round_broadcast_at: string | null
          round_escalated_at: string | null
          routing_rule_id: string | null
          scheduled_release_at: string | null
          sea_view_importance: string | null
          sla_breached: boolean | null
          timeframe: string | null
          total_contacts: number | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          archived_reason?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          assignment_method?: string | null
          bedrooms_desired?: string | null
          breach_timestamp?: string | null
          budget_range?: string | null
          city_name?: string | null
          city_slug?: string | null
          claim_broadcast_sent?: boolean | null
          claim_window_expires_at?: string | null
          claimed_by?: string | null
          contact_complete?: boolean | null
          conversation_duration?: string | null
          conversation_transcript?: Json | null
          country_prefix?: string | null
          created_at?: string | null
          current_lead_score?: number | null
          current_round?: number | null
          days_since_last_contact?: number | null
          email?: string | null
          exit_point?: string | null
          first_action_completed?: boolean | null
          first_contact_at?: string | null
          first_name: string
          full_phone?: string | null
          id?: string
          initial_lead_score?: number | null
          intake_complete?: boolean | null
          interest?: string | null
          is_night_held?: boolean | null
          language: string
          last_contact_at?: string | null
          last_name: string
          lead_claimed?: boolean | null
          lead_priority?: string | null
          lead_segment?: string | null
          lead_source: string
          lead_source_detail: string
          lead_status?: string | null
          location_preference?: string[] | null
          message?: string | null
          page_slug?: string | null
          page_title?: string | null
          page_type?: string | null
          page_url: string
          phone_number?: string | null
          property_price?: string | null
          property_purpose?: string | null
          property_ref?: string | null
          property_type?: string[] | null
          qa_pairs?: Json | null
          questions_answered?: number | null
          referrer?: string | null
          round_broadcast_at?: string | null
          round_escalated_at?: string | null
          routing_rule_id?: string | null
          scheduled_release_at?: string | null
          sea_view_importance?: string | null
          sla_breached?: boolean | null
          timeframe?: string | null
          total_contacts?: number | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          archived_reason?: string | null
          assigned_agent_id?: string | null
          assigned_at?: string | null
          assignment_method?: string | null
          bedrooms_desired?: string | null
          breach_timestamp?: string | null
          budget_range?: string | null
          city_name?: string | null
          city_slug?: string | null
          claim_broadcast_sent?: boolean | null
          claim_window_expires_at?: string | null
          claimed_by?: string | null
          contact_complete?: boolean | null
          conversation_duration?: string | null
          conversation_transcript?: Json | null
          country_prefix?: string | null
          created_at?: string | null
          current_lead_score?: number | null
          current_round?: number | null
          days_since_last_contact?: number | null
          email?: string | null
          exit_point?: string | null
          first_action_completed?: boolean | null
          first_contact_at?: string | null
          first_name?: string
          full_phone?: string | null
          id?: string
          initial_lead_score?: number | null
          intake_complete?: boolean | null
          interest?: string | null
          is_night_held?: boolean | null
          language?: string
          last_contact_at?: string | null
          last_name?: string
          lead_claimed?: boolean | null
          lead_priority?: string | null
          lead_segment?: string | null
          lead_source?: string
          lead_source_detail?: string
          lead_status?: string | null
          location_preference?: string[] | null
          message?: string | null
          page_slug?: string | null
          page_title?: string | null
          page_type?: string | null
          page_url?: string
          phone_number?: string | null
          property_price?: string | null
          property_purpose?: string | null
          property_ref?: string | null
          property_type?: string[] | null
          qa_pairs?: Json | null
          questions_answered?: number | null
          referrer?: string | null
          round_broadcast_at?: string | null
          round_escalated_at?: string | null
          routing_rule_id?: string | null
          scheduled_release_at?: string | null
          sea_view_importance?: string | null
          sla_breached?: boolean | null
          timeframe?: string | null
          total_contacts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_routing_rule_id_fkey"
            columns: ["routing_rule_id"]
            isOneToOne: false
            referencedRelation: "crm_routing_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notifications: {
        Row: {
          action_url: string | null
          agent_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          message: string | null
          notification_type: string
          read: boolean | null
          read_at: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          agent_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          notification_type: string
          read?: boolean | null
          read_at?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          agent_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          notification_type?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reminders: {
        Row: {
          activity_id: string | null
          agent_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          email_sent: boolean | null
          id: string
          is_completed: boolean | null
          lead_id: string | null
          notification_sent_at: string | null
          reminder_datetime: string
          reminder_type: string | null
          send_email: boolean | null
          slack_sent: boolean | null
          snoozed_until: string | null
          title: string
        }
        Insert: {
          activity_id?: string | null
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email_sent?: boolean | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          notification_sent_at?: string | null
          reminder_datetime: string
          reminder_type?: string | null
          send_email?: boolean | null
          slack_sent?: boolean | null
          snoozed_until?: string | null
          title: string
        }
        Update: {
          activity_id?: string | null
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email_sent?: boolean | null
          id?: string
          is_completed?: boolean | null
          lead_id?: string | null
          notification_sent_at?: string | null
          reminder_datetime?: string
          reminder_type?: string | null
          send_email?: boolean | null
          slack_sent?: boolean | null
          snoozed_until?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reminders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "crm_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_round_robin_config: {
        Row: {
          agent_ids: string[]
          claim_window_minutes: number | null
          created_at: string | null
          fallback_admin_id: string | null
          id: string
          is_active: boolean | null
          is_admin_fallback: boolean | null
          language: string
          round_number: number
          updated_at: string | null
        }
        Insert: {
          agent_ids: string[]
          claim_window_minutes?: number | null
          created_at?: string | null
          fallback_admin_id?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_fallback?: boolean | null
          language: string
          round_number: number
          updated_at?: string | null
        }
        Update: {
          agent_ids?: string[]
          claim_window_minutes?: number | null
          created_at?: string | null
          fallback_admin_id?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_fallback?: boolean | null
          language?: string
          round_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_round_robin_config_fallback_admin_id_fkey"
            columns: ["fallback_admin_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_routing_rules: {
        Row: {
          assign_to_agent_id: string
          created_at: string | null
          created_by: string | null
          fallback_to_broadcast: boolean | null
          id: string
          is_active: boolean | null
          last_matched_at: string | null
          match_budget_range: string[] | null
          match_language: string[] | null
          match_lead_segment: string[] | null
          match_lead_source: string[] | null
          match_page_slug: string[] | null
          match_page_type: string[] | null
          match_property_type: string[] | null
          match_timeframe: string[] | null
          priority: number | null
          rule_description: string | null
          rule_name: string
          total_matches: number | null
          updated_at: string | null
        }
        Insert: {
          assign_to_agent_id: string
          created_at?: string | null
          created_by?: string | null
          fallback_to_broadcast?: boolean | null
          id?: string
          is_active?: boolean | null
          last_matched_at?: string | null
          match_budget_range?: string[] | null
          match_language?: string[] | null
          match_lead_segment?: string[] | null
          match_lead_source?: string[] | null
          match_page_slug?: string[] | null
          match_page_type?: string[] | null
          match_property_type?: string[] | null
          match_timeframe?: string[] | null
          priority?: number | null
          rule_description?: string | null
          rule_name: string
          total_matches?: number | null
          updated_at?: string | null
        }
        Update: {
          assign_to_agent_id?: string
          created_at?: string | null
          created_by?: string | null
          fallback_to_broadcast?: boolean | null
          id?: string
          is_active?: boolean | null
          last_matched_at?: string | null
          match_budget_range?: string[] | null
          match_language?: string[] | null
          match_lead_segment?: string[] | null
          match_lead_source?: string[] | null
          match_page_slug?: string[] | null
          match_page_type?: string[] | null
          match_property_type?: string[] | null
          match_timeframe?: string[] | null
          priority?: number | null
          rule_description?: string | null
          rule_name?: string
          total_matches?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_routing_rules_assign_to_agent_id_fkey"
            columns: ["assign_to_agent_id"]
            isOneToOne: false
            referencedRelation: "crm_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      dead_link_replacements: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          applied_to_articles: string[] | null
          confidence_score: number | null
          created_at: string | null
          duplicate_count: number | null
          id: string
          original_source: string | null
          original_url: string
          replacement_count: number | null
          replacement_reason: string | null
          replacement_source: string | null
          replacement_url: string
          status: string | null
          suggested_by: string | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          applied_to_articles?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          duplicate_count?: number | null
          id?: string
          original_source?: string | null
          original_url: string
          replacement_count?: number | null
          replacement_reason?: string | null
          replacement_source?: string | null
          replacement_url: string
          status?: string | null
          suggested_by?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          applied_to_articles?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          duplicate_count?: number | null
          id?: string
          original_source?: string | null
          original_url?: string
          replacement_count?: number | null
          replacement_reason?: string | null
          replacement_source?: string | null
          replacement_url?: string
          status?: string | null
          suggested_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discovered_domains: {
        Row: {
          article_topics: Json | null
          created_at: string | null
          domain: string
          example_urls: Json | null
          first_suggested_at: string | null
          id: string
          last_suggested_at: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_name: string | null
          status: string | null
          times_suggested: number | null
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          article_topics?: Json | null
          created_at?: string | null
          domain: string
          example_urls?: Json | null
          first_suggested_at?: string | null
          id?: string
          last_suggested_at?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name?: string | null
          status?: string | null
          times_suggested?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          article_topics?: Json | null
          created_at?: string | null
          domain?: string
          example_urls?: Json | null
          first_suggested_at?: string | null
          id?: string
          last_suggested_at?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name?: string | null
          status?: string | null
          times_suggested?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      domain_usage_stats: {
        Row: {
          articles_used_in: number | null
          avg_uses_per_article: number | null
          category: string | null
          created_at: string | null
          domain: string
          id: string
          last_suggested_at: string | null
          last_used_at: string | null
          tier: string | null
          times_rejected: number | null
          times_suggested: number | null
          total_uses: number | null
          updated_at: string | null
        }
        Insert: {
          articles_used_in?: number | null
          avg_uses_per_article?: number | null
          category?: string | null
          created_at?: string | null
          domain: string
          id?: string
          last_suggested_at?: string | null
          last_used_at?: string | null
          tier?: string | null
          times_rejected?: number | null
          times_suggested?: number | null
          total_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          articles_used_in?: number | null
          avg_uses_per_article?: number | null
          category?: string | null
          created_at?: string | null
          domain?: string
          id?: string
          last_suggested_at?: string | null
          last_used_at?: string | null
          tier?: string | null
          times_rejected?: number | null
          times_suggested?: number | null
          total_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      emma_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          custom_fields: Json | null
          id: string
          language: string
          messages: Json
          name: string | null
          sales_notes: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          custom_fields?: Json | null
          id?: string
          language?: string
          messages?: Json
          name?: string | null
          sales_notes?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          custom_fields?: Json | null
          id?: string
          language?: string
          messages?: Json
          name?: string | null
          sales_notes?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      emma_leads: {
        Row: {
          answer_1: string | null
          answer_10: string | null
          answer_2: string | null
          answer_3: string | null
          answer_4: string | null
          answer_5: string | null
          answer_6: string | null
          answer_7: string | null
          answer_8: string | null
          answer_9: string | null
          bedrooms_desired: string | null
          budget_range: string | null
          conversation_date: string | null
          conversation_duration: string | null
          conversation_id: string
          conversation_status: string | null
          conversation_transcript: Json | null
          country_prefix: string | null
          created_at: string | null
          declined_selection: boolean | null
          detected_language: string | null
          exit_point: string | null
          first_name: string | null
          id: string
          initial_lead_score: number | null
          intake_complete: boolean | null
          last_name: string | null
          lead_segment: string | null
          lead_source: string | null
          lead_source_detail: string | null
          location_preference: Json | null
          page_title: string | null
          page_type: string | null
          page_url: string | null
          phone_number: string | null
          property_purpose: string | null
          property_type: Json | null
          question_1: string | null
          question_10: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          question_6: string | null
          question_7: string | null
          question_8: string | null
          question_9: string | null
          questions_answered: number | null
          referrer: string | null
          sea_view_importance: string | null
          timeframe: string | null
          updated_at: string | null
          webhook_attempts: number | null
          webhook_last_error: string | null
          webhook_payload: Json | null
          webhook_sent: boolean | null
          webhook_sent_at: string | null
        }
        Insert: {
          answer_1?: string | null
          answer_10?: string | null
          answer_2?: string | null
          answer_3?: string | null
          answer_4?: string | null
          answer_5?: string | null
          answer_6?: string | null
          answer_7?: string | null
          answer_8?: string | null
          answer_9?: string | null
          bedrooms_desired?: string | null
          budget_range?: string | null
          conversation_date?: string | null
          conversation_duration?: string | null
          conversation_id: string
          conversation_status?: string | null
          conversation_transcript?: Json | null
          country_prefix?: string | null
          created_at?: string | null
          declined_selection?: boolean | null
          detected_language?: string | null
          exit_point?: string | null
          first_name?: string | null
          id?: string
          initial_lead_score?: number | null
          intake_complete?: boolean | null
          last_name?: string | null
          lead_segment?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          location_preference?: Json | null
          page_title?: string | null
          page_type?: string | null
          page_url?: string | null
          phone_number?: string | null
          property_purpose?: string | null
          property_type?: Json | null
          question_1?: string | null
          question_10?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          question_8?: string | null
          question_9?: string | null
          questions_answered?: number | null
          referrer?: string | null
          sea_view_importance?: string | null
          timeframe?: string | null
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_last_error?: string | null
          webhook_payload?: Json | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Update: {
          answer_1?: string | null
          answer_10?: string | null
          answer_2?: string | null
          answer_3?: string | null
          answer_4?: string | null
          answer_5?: string | null
          answer_6?: string | null
          answer_7?: string | null
          answer_8?: string | null
          answer_9?: string | null
          bedrooms_desired?: string | null
          budget_range?: string | null
          conversation_date?: string | null
          conversation_duration?: string | null
          conversation_id?: string
          conversation_status?: string | null
          conversation_transcript?: Json | null
          country_prefix?: string | null
          created_at?: string | null
          declined_selection?: boolean | null
          detected_language?: string | null
          exit_point?: string | null
          first_name?: string | null
          id?: string
          initial_lead_score?: number | null
          intake_complete?: boolean | null
          last_name?: string | null
          lead_segment?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          location_preference?: Json | null
          page_title?: string | null
          page_type?: string | null
          page_url?: string | null
          phone_number?: string | null
          property_purpose?: string | null
          property_type?: Json | null
          question_1?: string | null
          question_10?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          question_8?: string | null
          question_9?: string | null
          questions_answered?: number | null
          referrer?: string | null
          sea_view_importance?: string | null
          timeframe?: string | null
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_last_error?: string | null
          webhook_payload?: Json | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Relationships: []
      }
      external_citation_health: {
        Row: {
          authority_score: number | null
          content_hash: string | null
          created_at: string | null
          first_seen_at: string | null
          http_status_code: number | null
          id: string
          is_government_source: boolean | null
          language: string | null
          last_checked_at: string | null
          page_title: string | null
          redirect_url: string | null
          response_time_ms: number | null
          source_name: string | null
          source_type: string | null
          status: string | null
          times_failed: number | null
          times_verified: number | null
          updated_at: string | null
          url: string
          verification_date: string | null
        }
        Insert: {
          authority_score?: number | null
          content_hash?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          http_status_code?: number | null
          id?: string
          is_government_source?: boolean | null
          language?: string | null
          last_checked_at?: string | null
          page_title?: string | null
          redirect_url?: string | null
          response_time_ms?: number | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          times_failed?: number | null
          times_verified?: number | null
          updated_at?: string | null
          url: string
          verification_date?: string | null
        }
        Update: {
          authority_score?: number | null
          content_hash?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          http_status_code?: number | null
          id?: string
          is_government_source?: boolean | null
          language?: string | null
          last_checked_at?: string | null
          page_title?: string | null
          redirect_url?: string | null
          response_time_ms?: number | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          times_failed?: number | null
          times_verified?: number | null
          updated_at?: string | null
          url?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          city: string | null
          completed_languages: string[] | null
          country: string | null
          created_at: string | null
          error_message: string | null
          hreflang_group_id: string | null
          id: string
          intent_type: string | null
          job_type: string
          languages: string[] | null
          region: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          completed_languages?: string[] | null
          country?: string | null
          created_at?: string | null
          error_message?: string | null
          hreflang_group_id?: string | null
          id?: string
          intent_type?: string | null
          job_type?: string
          languages?: string[] | null
          region?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          completed_languages?: string[] | null
          country?: string | null
          created_at?: string | null
          error_message?: string | null
          hreflang_group_id?: string | null
          id?: string
          intent_type?: string | null
          job_type?: string
          languages?: string[] | null
          region?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gone_url_hits: {
        Row: {
          hit_at: string | null
          id: string
          ip_address: string | null
          url_path: string
          user_agent: string | null
        }
        Insert: {
          hit_at?: string | null
          id?: string
          ip_address?: string | null
          url_path: string
          user_agent?: string | null
        }
        Update: {
          hit_at?: string | null
          id?: string
          ip_address?: string | null
          url_path?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      gone_urls: {
        Row: {
          created_at: string | null
          id: string
          marked_gone_at: string | null
          pattern_match: boolean | null
          reason: string | null
          url_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marked_gone_at?: string | null
          pattern_match?: boolean | null
          reason?: string | null
          url_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marked_gone_at?: string | null
          pattern_match?: boolean | null
          reason?: string | null
          url_path?: string
        }
        Relationships: []
      }
      image_regeneration_queue: {
        Row: {
          article_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          image_prompt: string | null
          max_retries: number | null
          new_image_url: string | null
          original_image_url: string | null
          priority: number | null
          reason: string | null
          retry_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          article_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_prompt?: string | null
          max_retries?: number | null
          new_image_url?: string | null
          original_image_url?: string | null
          priority?: number | null
          reason?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          article_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_prompt?: string | null
          max_retries?: number | null
          new_image_url?: string | null
          original_image_url?: string | null
          priority?: number | null
          reason?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_regeneration_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_regeneration_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_link_suggestions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          article_id: string
          confidence_score: number | null
          created_at: string | null
          generated_at: string
          id: string
          status: string
          suggested_links: Json
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          article_id: string
          confidence_score?: number | null
          created_at?: string | null
          generated_at?: string
          id?: string
          status?: string
          suggested_links?: Json
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          article_id?: string
          confidence_score?: number | null
          created_at?: string | null
          generated_at?: string
          id?: string
          status?: string
          suggested_links?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_link_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_link_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          comment: string | null
          consent: boolean | null
          country_code: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          language: string
          notes: string | null
          page_url: string | null
          phone: string
          property_interest: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_to?: string | null
          comment?: string | null
          consent?: boolean | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          language: string
          notes?: string | null
          page_url?: string | null
          phone: string
          property_interest?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to?: string | null
          comment?: string | null
          consent?: boolean | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          language?: string
          notes?: string | null
          page_url?: string | null
          phone?: string
          property_interest?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      link_suggestions: {
        Row: {
          applied_at: string | null
          article_id: string | null
          created_at: string | null
          id: string
          old_url: string
          reason: string
          relevance_score: number | null
          status: string | null
          suggested_url: string
        }
        Insert: {
          applied_at?: string | null
          article_id?: string | null
          created_at?: string | null
          id?: string
          old_url: string
          reason: string
          relevance_score?: number | null
          status?: string | null
          suggested_url: string
        }
        Update: {
          applied_at?: string | null
          article_id?: string | null
          created_at?: string | null
          id?: string
          old_url?: string
          reason?: string
          relevance_score?: number | null
          status?: string | null
          suggested_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_suggestions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      link_validation_alerts: {
        Row: {
          alert_type: string
          article_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          article_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          article_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_validation_alerts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_validation_alerts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      link_validations: {
        Row: {
          article_id: string
          article_language: string
          article_slug: string
          article_topic: string | null
          broken_links_count: number | null
          created_at: string
          external_links: Json | null
          id: string
          internal_links: Json | null
          irrelevant_links_count: number | null
          language_mismatch_count: number | null
          recommendations: Json | null
          status: string | null
          validation_date: string
        }
        Insert: {
          article_id: string
          article_language: string
          article_slug: string
          article_topic?: string | null
          broken_links_count?: number | null
          created_at?: string
          external_links?: Json | null
          id?: string
          internal_links?: Json | null
          irrelevant_links_count?: number | null
          language_mismatch_count?: number | null
          recommendations?: Json | null
          status?: string | null
          validation_date?: string
        }
        Update: {
          article_id?: string
          article_language?: string
          article_slug?: string
          article_topic?: string | null
          broken_links_count?: number | null
          created_at?: string
          external_links?: Json | null
          id?: string
          internal_links?: Json | null
          irrelevant_links_count?: number | null
          language_mismatch_count?: number | null
          recommendations?: Json | null
          status?: string | null
          validation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_validations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_validations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      location_pages: {
        Row: {
          author_id: string | null
          best_areas: Json | null
          canonical_url: string | null
          city_name: string
          city_slug: string
          content_type: string | null
          cost_breakdown: Json | null
          country: string
          created_at: string | null
          date_modified: string | null
          date_published: string | null
          external_citations: Json | null
          featured_image_alt: string | null
          featured_image_caption: string | null
          featured_image_height: number | null
          featured_image_url: string | null
          featured_image_width: number | null
          final_summary: string | null
          headline: string
          hreflang_group_id: string | null
          id: string
          image_prompt: string | null
          intent_type: string
          internal_links: Json | null
          is_redirect: boolean | null
          language: string
          location_overview: string | null
          market_breakdown: string | null
          meta_description: string
          meta_title: string
          qa_entities: Json | null
          redirect_to: string | null
          region: string
          reviewer_id: string | null
          source_language: string | null
          speakable_answer: string
          status: string
          topic_slug: string
          translations: Json | null
          updated_at: string | null
          use_cases: string | null
        }
        Insert: {
          author_id?: string | null
          best_areas?: Json | null
          canonical_url?: string | null
          city_name: string
          city_slug: string
          content_type?: string | null
          cost_breakdown?: Json | null
          country?: string
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          external_citations?: Json | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_height?: number | null
          featured_image_url?: string | null
          featured_image_width?: number | null
          final_summary?: string | null
          headline: string
          hreflang_group_id?: string | null
          id?: string
          image_prompt?: string | null
          intent_type: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language?: string
          location_overview?: string | null
          market_breakdown?: string | null
          meta_description: string
          meta_title: string
          qa_entities?: Json | null
          redirect_to?: string | null
          region?: string
          reviewer_id?: string | null
          source_language?: string | null
          speakable_answer: string
          status?: string
          topic_slug: string
          translations?: Json | null
          updated_at?: string | null
          use_cases?: string | null
        }
        Update: {
          author_id?: string | null
          best_areas?: Json | null
          canonical_url?: string | null
          city_name?: string
          city_slug?: string
          content_type?: string | null
          cost_breakdown?: Json | null
          country?: string
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          external_citations?: Json | null
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_height?: number | null
          featured_image_url?: string | null
          featured_image_width?: number | null
          final_summary?: string | null
          headline?: string
          hreflang_group_id?: string | null
          id?: string
          image_prompt?: string | null
          intent_type?: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language?: string
          location_overview?: string | null
          market_breakdown?: string | null
          meta_description?: string
          meta_title?: string
          qa_entities?: Json | null
          redirect_to?: string | null
          region?: string
          reviewer_id?: string | null
          source_language?: string | null
          speakable_answer?: string
          status?: string
          topic_slug?: string
          translations?: Json | null
          updated_at?: string | null
          use_cases?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_pages_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      page_translations: {
        Row: {
          created_at: string | null
          id: string
          is_published: boolean | null
          language_code: string
          page_identifier: string | null
          page_type: string
          updated_at: string | null
          url_slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          language_code: string
          page_identifier?: string | null
          page_type: string
          updated_at?: string | null
          url_slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          language_code?: string
          page_identifier?: string | null
          page_type?: string
          updated_at?: string | null
          url_slug?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          baths: number
          beds_max: number | null
          beds_min: number
          category: string
          created_at: string | null
          descriptions: Json
          display_order: number | null
          id: string
          images: Json
          internal_name: string
          internal_ref: string | null
          is_active: boolean | null
          location: string
          price_eur: number
          size_sqm: number
          updated_at: string | null
        }
        Insert: {
          baths: number
          beds_max?: number | null
          beds_min: number
          category: string
          created_at?: string | null
          descriptions?: Json
          display_order?: number | null
          id?: string
          images?: Json
          internal_name: string
          internal_ref?: string | null
          is_active?: boolean | null
          location: string
          price_eur: number
          size_sqm: number
          updated_at?: string | null
        }
        Update: {
          baths?: number
          beds_max?: number | null
          beds_min?: number
          category?: string
          created_at?: string | null
          descriptions?: Json
          display_order?: number | null
          id?: string
          images?: Json
          internal_name?: string
          internal_ref?: string | null
          is_active?: boolean | null
          location?: string
          price_eur?: number
          size_sqm?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_article_tracking: {
        Row: {
          created_at: string | null
          hreflang_group_core: string
          hreflang_group_decision: string
          id: string
          languages_generated: string[]
          source_article_headline: string
          source_article_id: string
          source_article_slug: string
          status: string
          total_qa_pages: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hreflang_group_core: string
          hreflang_group_decision: string
          id?: string
          languages_generated?: string[]
          source_article_headline: string
          source_article_id: string
          source_article_slug: string
          status?: string
          total_qa_pages?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hreflang_group_core?: string
          hreflang_group_decision?: string
          id?: string
          languages_generated?: string[]
          source_article_headline?: string
          source_article_id?: string
          source_article_slug?: string
          status?: string
          total_qa_pages?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_generation_errors: {
        Row: {
          article_id: string | null
          cluster_id: string | null
          created_at: string | null
          error_message: string | null
          error_type: string | null
          id: string
          job_id: string | null
          language: string | null
          qa_type: string | null
        }
        Insert: {
          article_id?: string | null
          cluster_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          job_id?: string | null
          language?: string | null
          qa_type?: string | null
        }
        Update: {
          article_id?: string | null
          cluster_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          job_id?: string | null
          language?: string | null
          qa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_generation_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "qa_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_generation_jobs: {
        Row: {
          article_ids: string[] | null
          article_results: Json | null
          article_status: Json | null
          articles_completed: number | null
          cluster_id: string | null
          completed_at: string | null
          completion_percent: number | null
          created_at: string | null
          current_article_headline: string | null
          current_article_index: number | null
          current_language: string | null
          error: string | null
          generated_faq_pages: number | null
          id: string
          languages: string[] | null
          mode: string
          processed_articles: number | null
          results: Json | null
          resume_from_article_index: number | null
          resume_from_language: string | null
          resume_from_qa_type: string | null
          started_at: string | null
          status: string
          total_articles: number | null
          total_faq_pages: number | null
          total_qas_created: number | null
          total_qas_failed: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          article_ids?: string[] | null
          article_results?: Json | null
          article_status?: Json | null
          articles_completed?: number | null
          cluster_id?: string | null
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          current_article_headline?: string | null
          current_article_index?: number | null
          current_language?: string | null
          error?: string | null
          generated_faq_pages?: number | null
          id?: string
          languages?: string[] | null
          mode?: string
          processed_articles?: number | null
          results?: Json | null
          resume_from_article_index?: number | null
          resume_from_language?: string | null
          resume_from_qa_type?: string | null
          started_at?: string | null
          status?: string
          total_articles?: number | null
          total_faq_pages?: number | null
          total_qas_created?: number | null
          total_qas_failed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          article_ids?: string[] | null
          article_results?: Json | null
          article_status?: Json | null
          articles_completed?: number | null
          cluster_id?: string | null
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          current_article_headline?: string | null
          current_article_index?: number | null
          current_language?: string | null
          error?: string | null
          generated_faq_pages?: number | null
          id?: string
          languages?: string[] | null
          mode?: string
          processed_articles?: number | null
          results?: Json | null
          resume_from_article_index?: number | null
          resume_from_language?: string | null
          resume_from_qa_type?: string | null
          started_at?: string | null
          status?: string
          total_articles?: number | null
          total_faq_pages?: number | null
          total_qas_created?: number | null
          total_qas_failed?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qa_pages: {
        Row: {
          answer_main: string
          author_id: string | null
          canonical_url: string | null
          category: string | null
          cluster_id: string | null
          content_type: string | null
          created_at: string | null
          date_modified: string | null
          date_published: string | null
          featured_image_alt: string
          featured_image_caption: string | null
          featured_image_url: string
          funnel_stage: string | null
          hreflang_group_id: string | null
          id: string
          internal_links: Json | null
          is_redirect: boolean | null
          language: string
          meta_description: string
          meta_title: string
          qa_type: string
          question_main: string
          redirect_to: string | null
          related_qas: Json | null
          slug: string
          source_article_id: string
          source_article_slug: string | null
          source_language: string | null
          speakable_answer: string
          status: string
          title: string
          tracking_id: string | null
          translations: Json | null
          updated_at: string | null
        }
        Insert: {
          answer_main: string
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          cluster_id?: string | null
          content_type?: string | null
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          featured_image_alt: string
          featured_image_caption?: string | null
          featured_image_url: string
          funnel_stage?: string | null
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language: string
          meta_description: string
          meta_title: string
          qa_type: string
          question_main: string
          redirect_to?: string | null
          related_qas?: Json | null
          slug: string
          source_article_id: string
          source_article_slug?: string | null
          source_language?: string | null
          speakable_answer: string
          status?: string
          title: string
          tracking_id?: string | null
          translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          answer_main?: string
          author_id?: string | null
          canonical_url?: string | null
          category?: string | null
          cluster_id?: string | null
          content_type?: string | null
          created_at?: string | null
          date_modified?: string | null
          date_published?: string | null
          featured_image_alt?: string
          featured_image_caption?: string | null
          featured_image_url?: string
          funnel_stage?: string | null
          hreflang_group_id?: string | null
          id?: string
          internal_links?: Json | null
          is_redirect?: boolean | null
          language?: string
          meta_description?: string
          meta_title?: string
          qa_type?: string
          question_main?: string
          redirect_to?: string | null
          related_qas?: Json | null
          slug?: string
          source_article_id?: string
          source_article_slug?: string | null
          source_language?: string | null
          speakable_answer?: string
          status?: string
          title?: string
          tracking_id?: string | null
          translations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_pages_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_pages_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_pages_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "qa_article_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      retargeting_leads: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          language: string
          notes: string | null
          question: string | null
          source_url: string | null
          status: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          language?: string
          notes?: string | null
          question?: string | null
          source_url?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          language?: string
          notes?: string | null
          question?: string | null
          source_url?: string | null
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      server_errors: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          referrer: string | null
          stack_trace: string | null
          status_code: number | null
          url_path: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          referrer?: string | null
          stack_trace?: string | null
          status_code?: number | null
          url_path: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          referrer?: string | null
          stack_trace?: string | null
          status_code?: number | null
          url_path?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_languages: {
        Row: {
          created_at: string | null
          display_flag: string | null
          hreflang_code: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language_code: string
          language_name: string
          sort_order: number | null
          url_prefix: string | null
        }
        Insert: {
          created_at?: string | null
          display_flag?: string | null
          hreflang_code: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language_code: string
          language_name: string
          sort_order?: number | null
          url_prefix?: string | null
        }
        Update: {
          created_at?: string | null
          display_flag?: string | null
          hreflang_code?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language_code?: string
          language_name?: string
          sort_order?: number | null
          url_prefix?: string | null
        }
        Relationships: []
      }
      sitemap_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json | null
          id: string
          is_resolved: boolean | null
          message: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          message: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: []
      }
      sitemap_validations: {
        Row: {
          articles_in_sitemap: number
          articles_with_changefreq: number
          articles_with_images: number
          articles_with_lastmod: number
          articles_with_priority: number
          broken_urls: Json | null
          broken_urls_count: number | null
          coverage_percentage: number
          created_at: string
          health_score: number
          id: string
          images_with_caption: number | null
          images_with_title: number | null
          last_submitted_to_bing: string | null
          last_submitted_to_gsc: string | null
          missing_article_slugs: Json | null
          recommendations: Json | null
          sitemap_file_size_kb: number | null
          total_images: number | null
          total_published_articles: number
          total_urls: number
          validated_by: string | null
          validation_duration_ms: number | null
          xml_is_valid: boolean
          xml_validation_errors: Json | null
        }
        Insert: {
          articles_in_sitemap: number
          articles_with_changefreq?: number
          articles_with_images?: number
          articles_with_lastmod?: number
          articles_with_priority?: number
          broken_urls?: Json | null
          broken_urls_count?: number | null
          coverage_percentage: number
          created_at?: string
          health_score: number
          id?: string
          images_with_caption?: number | null
          images_with_title?: number | null
          last_submitted_to_bing?: string | null
          last_submitted_to_gsc?: string | null
          missing_article_slugs?: Json | null
          recommendations?: Json | null
          sitemap_file_size_kb?: number | null
          total_images?: number | null
          total_published_articles: number
          total_urls: number
          validated_by?: string | null
          validation_duration_ms?: number | null
          xml_is_valid?: boolean
          xml_validation_errors?: Json | null
        }
        Update: {
          articles_in_sitemap?: number
          articles_with_changefreq?: number
          articles_with_images?: number
          articles_with_lastmod?: number
          articles_with_priority?: number
          broken_urls?: Json | null
          broken_urls_count?: number | null
          coverage_percentage?: number
          created_at?: string
          health_score?: number
          id?: string
          images_with_caption?: number | null
          images_with_title?: number | null
          last_submitted_to_bing?: string | null
          last_submitted_to_gsc?: string | null
          missing_article_slugs?: Json | null
          recommendations?: Json | null
          sitemap_file_size_kb?: number | null
          total_images?: number | null
          total_published_articles?: number
          total_urls?: number
          validated_by?: string | null
          validation_duration_ms?: number | null
          xml_is_valid?: boolean
          xml_validation_errors?: Json | null
        }
        Relationships: []
      }
      translation_audit_log: {
        Row: {
          affected_language: string
          article_headline: string | null
          article_id: string
          article_status: string | null
          change_reason: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string | null
          new_translation_slug: string | null
          previous_status: string | null
          previous_translation_slug: string | null
          validation_result: Json | null
        }
        Insert: {
          affected_language: string
          article_headline?: string | null
          article_id: string
          article_status?: string | null
          change_reason?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          new_translation_slug?: string | null
          previous_status?: string | null
          previous_translation_slug?: string | null
          validation_result?: Json | null
        }
        Update: {
          affected_language?: string
          article_headline?: string | null
          article_id?: string
          article_status?: string | null
          change_reason?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          new_translation_slug?: string | null
          previous_status?: string | null
          previous_translation_slug?: string | null
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_audit_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translation_audit_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_status: {
        Row: {
          article_id: string
          bidirectional_valid: boolean | null
          blocking_issues: string[] | null
          completeness_score: number
          content_similarity_score: number | null
          created_at: string | null
          has_translation: boolean
          id: string
          language_code: string
          last_validated_at: string | null
          linked_languages: number
          missing_languages: string[] | null
          total_languages: number
          translation_article_id: string | null
          translation_slug: string | null
          updated_at: string | null
          url_exists: boolean | null
          validated_by: string | null
          validation_status: string
          warnings: string[] | null
        }
        Insert: {
          article_id: string
          bidirectional_valid?: boolean | null
          blocking_issues?: string[] | null
          completeness_score?: number
          content_similarity_score?: number | null
          created_at?: string | null
          has_translation?: boolean
          id?: string
          language_code: string
          last_validated_at?: string | null
          linked_languages?: number
          missing_languages?: string[] | null
          total_languages: number
          translation_article_id?: string | null
          translation_slug?: string | null
          updated_at?: string | null
          url_exists?: boolean | null
          validated_by?: string | null
          validation_status?: string
          warnings?: string[] | null
        }
        Update: {
          article_id?: string
          bidirectional_valid?: boolean | null
          blocking_issues?: string[] | null
          completeness_score?: number
          content_similarity_score?: number | null
          created_at?: string | null
          has_translation?: boolean
          id?: string
          language_code?: string
          last_validated_at?: string | null
          linked_languages?: number
          missing_languages?: string[] | null
          total_languages?: number
          translation_article_id?: string | null
          translation_slug?: string | null
          updated_at?: string | null
          url_exists?: boolean | null
          validated_by?: string | null
          validation_status?: string
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_status_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translation_status_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translation_status_translation_article_id_fkey"
            columns: ["translation_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translation_status_translation_article_id_fkey"
            columns: ["translation_article_id"]
            isOneToOne: false
            referencedRelation: "content_freshness_report"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_changes: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      content_freshness_report: {
        Row: {
          date_modified: string | null
          date_published: string | null
          days_since_update: number | null
          freshness_status: string | null
          headline: string | null
          id: string | null
          language: string | null
          slug: string | null
          status: string | null
          update_count: number | null
        }
        Insert: {
          date_modified?: string | null
          date_published?: string | null
          days_since_update?: never
          freshness_status?: never
          headline?: string | null
          id?: string | null
          language?: string | null
          slug?: string | null
          status?: string | null
          update_count?: never
        }
        Update: {
          date_modified?: string | null
          date_published?: string | null
          days_since_update?: never
          freshness_status?: never
          headline?: string | null
          id?: string | null
          language?: string | null
          slug?: string | null
          status?: string | null
          update_count?: never
        }
        Relationships: []
      }
      domain_diversity_report: {
        Row: {
          category: string | null
          diversity_score: number | null
          domain: string | null
          language: string | null
          region: string | null
          tier: string | null
          total_uses: number | null
          trust_score: number | null
          usage_status: string | null
        }
        Relationships: []
      }
      duplicate_image_articles: {
        Row: {
          article_ids: string[] | null
          cluster_ids: string[] | null
          featured_image_url: string | null
          headlines: string[] | null
          usage_count: number | null
        }
        Relationships: []
      }
      hreflang_siblings: {
        Row: {
          content_type: string | null
          hreflang_group_id: string | null
          id: string | null
          language: string | null
          slug: string | null
          url_path: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_translation_completeness: {
        Args: { p_article_id: string }
        Returns: number
      }
      can_access_lead: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
      check_extension_exists: {
        Args: { extension_name: string }
        Returns: boolean
      }
      check_stuck_citation_jobs: { Args: never; Returns: undefined }
      check_stuck_cluster_jobs: { Args: never; Returns: undefined }
      check_stuck_qa_jobs: { Args: never; Returns: undefined }
      claim_lead: {
        Args: { p_agent_id: string; p_lead_id: string }
        Returns: Json
      }
      cleanup_duplicate_replacements: {
        Args: never
        Returns: {
          duplicates_merged: number
          kept_id: string
          original_url: string
          replacement_url: string
        }[]
      }
      decrement_agent_lead_count: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      escalate_lead_to_next_round: {
        Args: { p_lead_id: string }
        Returns: Json
      }
      find_articles_with_citation: {
        Args: { citation_url: string; published_only?: boolean }
        Returns: {
          detailed_content: string
          external_citations: Json
          headline: string
          id: string
          language: string
          match_type: string
          status: string
        }[]
      }
      get_citation_health_stats: { Args: never; Returns: Json }
      get_cluster_image_health: {
        Args: never
        Returns: {
          cluster_id: string
          health_percent: number
          total_images: number
          unique_images: number
        }[]
      }
      get_cluster_qa_counts: {
        Args: never
        Returns: {
          cluster_id: string
          language: string
          published_count: number
          total_count: number
        }[]
      }
      get_database_triggers: {
        Args: never
        Returns: {
          action_statement: string
          event_object_table: string
          trigger_name: string
        }[]
      }
      get_diversity_report: {
        Args: never
        Returns: {
          category: string
          diversity_score: number
          domain: string
          language: string
          region: string
          tier: string
          total_uses: number
          trust_score: number
          usage_status: string
        }[]
      }
      get_missing_languages: {
        Args: { p_article_id: string }
        Returns: string[]
      }
      get_next_round_config: {
        Args: { p_current_round: number; p_language: string }
        Returns: {
          agent_ids: string[]
          claim_window_minutes: number
          is_admin_fallback: boolean
          round_number: number
        }[]
      }
      get_round_agents: {
        Args: { p_language: string; p_round: number }
        Returns: {
          agent_id: string
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_domain_usage: {
        Args: { p_article_id?: string; p_domain: string }
        Returns: {
          new_count: number
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_crm_agent: { Args: { _user_id: string }; Returns: boolean }
      normalize_url: {
        Args: { domain_only?: boolean; strip_query?: boolean; url: string }
        Returns: string
      }
      notify_lead_claimed: {
        Args: { p_claiming_agent_id: string; p_lead_id: string }
        Returns: undefined
      }
      replace_citation_tracking: {
        Args: {
          p_anchor_text: string
          p_article_id: string
          p_new_source: string
          p_new_url: string
          p_old_url: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
