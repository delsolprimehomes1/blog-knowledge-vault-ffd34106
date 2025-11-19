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
      approved_domains: {
        Row: {
          category: string
          created_at: string | null
          domain: string
          id: string
          is_allowed: boolean | null
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
      blog_articles: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category: string
          citation_failure_reason: string | null
          citation_health_score: number | null
          citation_status: string | null
          cluster_id: string | null
          cluster_number: number | null
          cluster_theme: string | null
          created_at: string
          cta_article_ids: string[] | null
          date_modified: string | null
          date_published: string | null
          detailed_content: string
          diagram_alt: string | null
          diagram_caption: string | null
          diagram_description: string | null
          diagram_url: string | null
          external_citations: Json | null
          faq_entities: Json | null
          featured_image_alt: string
          featured_image_caption: string | null
          featured_image_url: string
          funnel_stage: string
          has_dead_citations: boolean | null
          headline: string
          id: string
          internal_links: Json | null
          language: string
          last_citation_check_at: string | null
          last_edited_by: string | null
          last_link_validation: string | null
          link_depth: number | null
          meta_description: string
          meta_title: string
          published_by: string | null
          read_time: number | null
          related_article_ids: string[] | null
          related_cluster_articles: Json | null
          reviewer_id: string | null
          slug: string
          speakable_answer: string
          status: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category: string
          citation_failure_reason?: string | null
          citation_health_score?: number | null
          citation_status?: string | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          detailed_content: string
          diagram_alt?: string | null
          diagram_caption?: string | null
          diagram_description?: string | null
          diagram_url?: string | null
          external_citations?: Json | null
          faq_entities?: Json | null
          featured_image_alt: string
          featured_image_caption?: string | null
          featured_image_url: string
          funnel_stage: string
          has_dead_citations?: boolean | null
          headline: string
          id?: string
          internal_links?: Json | null
          language: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          last_link_validation?: string | null
          link_depth?: number | null
          meta_description: string
          meta_title: string
          published_by?: string | null
          read_time?: number | null
          related_article_ids?: string[] | null
          related_cluster_articles?: Json | null
          reviewer_id?: string | null
          slug: string
          speakable_answer: string
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string
          citation_failure_reason?: string | null
          citation_health_score?: number | null
          citation_status?: string | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          detailed_content?: string
          diagram_alt?: string | null
          diagram_caption?: string | null
          diagram_description?: string | null
          diagram_url?: string | null
          external_citations?: Json | null
          faq_entities?: Json | null
          featured_image_alt?: string
          featured_image_caption?: string | null
          featured_image_url?: string
          funnel_stage?: string
          has_dead_citations?: boolean | null
          headline?: string
          id?: string
          internal_links?: Json | null
          language?: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          last_link_validation?: string | null
          link_depth?: number | null
          meta_description?: string
          meta_title?: string
          published_by?: string | null
          read_time?: number | null
          related_article_ids?: string[] | null
          related_cluster_articles?: Json | null
          reviewer_id?: string | null
          slug?: string
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
      cluster_generations: {
        Row: {
          articles: Json | null
          articles_per_cluster: number | null
          cluster_count: number | null
          cluster_focus_areas: Json | null
          created_at: string | null
          error: string | null
          id: string
          language: string
          primary_keyword: string
          progress: Json | null
          started_at: string | null
          status: string
          target_audience: string
          timeout_at: string | null
          topic: string
          total_articles: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          language: string
          primary_keyword: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience: string
          timeout_at?: string | null
          topic: string
          total_articles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          language?: string
          primary_keyword?: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience?: string
          timeout_at?: string | null
          topic?: string
          total_articles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
    }
    Functions: {
      calculate_translation_completeness: {
        Args: { p_article_id: string }
        Returns: number
      }
      check_extension_exists: {
        Args: { extension_name: string }
        Returns: boolean
      }
      check_stuck_citation_jobs: { Args: never; Returns: undefined }
      check_stuck_cluster_jobs: { Args: never; Returns: undefined }
      cleanup_duplicate_replacements: {
        Args: never
        Returns: {
          duplicates_merged: number
          kept_id: string
          original_url: string
          replacement_url: string
        }[]
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
      normalize_url: {
        Args: { domain_only?: boolean; strip_query?: boolean; url: string }
        Returns: string
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
