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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_profiles: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          identification_type: string
          phone: string | null
          postal_code: string
          province: string | null
          tax_identifier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country?: string
          created_at?: string
          identification_type: string
          phone?: string | null
          postal_code: string
          province?: string | null
          tax_identifier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          identification_type?: string
          phone?: string | null
          postal_code?: string
          province?: string | null
          tax_identifier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_registrations: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          created_by: string
          email: string
          email_normalized: string | null
          id: string
          linked_at: string | null
          linked_user_id: string | null
          organization_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          created_by: string
          email: string
          email_normalized?: string | null
          id?: string
          linked_at?: string | null
          linked_user_id?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string
          email?: string
          email_normalized?: string | null
          id?: string
          linked_at?: string | null
          linked_user_id?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_question_dependencies: {
        Row: {
          child_question_id: string
          max_value: number
          min_value: number
          parent_question_id: string
        }
        Insert: {
          child_question_id: string
          max_value?: number
          min_value?: number
          parent_question_id: string
        }
        Update: {
          child_question_id?: string
          max_value?: number
          min_value?: number
          parent_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_question_dependencies_child_question_id_fkey"
            columns: ["child_question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_question_dependencies_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_questionnaires: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          slug: string
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          slug: string
          title: string
          version: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          version?: number
        }
        Relationships: []
      }
      diagnostic_questions: {
        Row: {
          dependency_mode: string
          dimension: string
          evidence_examples: string | null
          guidance: string | null
          id: string
          position: number
          prompt: string
          questionnaire_id: string
          required: boolean
        }
        Insert: {
          dependency_mode?: string
          dimension: string
          evidence_examples?: string | null
          guidance?: string | null
          id?: string
          position: number
          prompt: string
          questionnaire_id: string
          required?: boolean
        }
        Update: {
          dependency_mode?: string
          dimension?: string
          evidence_examples?: string | null
          guidance?: string | null
          id?: string
          position?: number
          prompt?: string
          questionnaire_id?: string
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_responses: {
        Row: {
          answered_by: string
          diagnostic_id: string
          question_id: string
          updated_at: string
          value: number
        }
        Insert: {
          answered_by: string
          diagnostic_id: string
          question_id: string
          updated_at?: string
          value: number
        }
        Update: {
          answered_by?: string
          diagnostic_id?: string
          question_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_responses_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          provisional_score: number | null
          questionnaire_id: string
          started_by: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          provisional_score?: number | null
          questionnaire_id: string
          started_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          provisional_score?: number | null
          questionnaire_id?: string
          started_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      nexaro_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          priority: string
          source: string
          source_reference: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          source?: string
          source_reference?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          source?: string
          source_reference?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexaro_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nexaro_work_entries: {
        Row: {
          category: string
          completed_on: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          completed_on?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_on?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexaro_work_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          country: string
          created_at: string
          created_by: string
          employee_count: number | null
          id: string
          legal_name: string | null
          name: string
          sector: string | null
          tax_identifier: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          created_by: string
          employee_count?: number | null
          id?: string
          legal_name?: string | null
          name: string
          sector?: string | null
          tax_identifier?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          employee_count?: number | null
          id?: string
          legal_name?: string | null
          name?: string
          sector?: string | null
          tax_identifier?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          email: string | null
          last_sign_in_at: string | null
          registered_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: string | null
          last_sign_in_at?: string | null
          registered_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: string | null
          last_sign_in_at?: string | null
          registered_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_task_completions: {
        Row: {
          completed_at: string
          completed_by: string
          diagnostic_id: string
          id: string
          organization_id: string
          task_key: string
          title: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          diagnostic_id: string
          id?: string
          organization_id: string
          task_key: string
          title: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          diagnostic_id?: string
          id?: string
          organization_id?: string
          task_key?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_task_completions_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_task_completions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_citations: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_client_domain: boolean
          is_external_authority: boolean
          position: number | null
          response_id: string
          snippet: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_client_domain?: boolean
          is_external_authority?: boolean
          position?: number | null
          response_id: string
          snippet?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_client_domain?: boolean
          is_external_authority?: boolean
          position?: number | null
          response_id?: string
          snippet?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_citations_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "visibility_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_competitors: {
        Row: {
          active: boolean
          created_at: string
          domain: string
          id: string
          name: string
          name_variants: string[]
          project_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain: string
          id?: string
          name: string
          name_variants?: string[]
          project_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string
          id?: string
          name?: string
          name_variants?: string[]
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_mentions: {
        Row: {
          attributes: string[]
          competitor_id: string | null
          confidence: number
          created_at: string
          entity_name: string
          entity_type: string
          evidence: string | null
          id: string
          needs_review: boolean
          response_id: string
          sentiment: string
        }
        Insert: {
          attributes?: string[]
          competitor_id?: string | null
          confidence: number
          created_at?: string
          entity_name: string
          entity_type: string
          evidence?: string | null
          id?: string
          needs_review?: boolean
          response_id: string
          sentiment: string
        }
        Update: {
          attributes?: string[]
          competitor_id?: string | null
          confidence?: number
          created_at?: string
          entity_name?: string
          entity_type?: string
          evidence?: string | null
          id?: string
          needs_review?: boolean
          response_id?: string
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_mentions_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "visibility_competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_mentions_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "visibility_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_metric_snapshots: {
        Row: {
          country: string | null
          generated_at: string
          id: string
          language: string | null
          metrics: Json
          model: string | null
          project_id: string
          provider: string | null
          run_id: string
        }
        Insert: {
          country?: string | null
          generated_at?: string
          id?: string
          language?: string | null
          metrics: Json
          model?: string | null
          project_id: string
          provider?: string | null
          run_id: string
        }
        Update: {
          country?: string | null
          generated_at?: string
          id?: string
          language?: string | null
          metrics?: Json
          model?: string | null
          project_id?: string
          provider?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_metric_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_metric_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_projects: {
        Row: {
          brand_name: string
          brand_variants: string[]
          business_description: string | null
          country: string
          created_at: string
          created_by: string
          domain: string
          gsc_property_url: string | null
          gsc_status: string
          id: string
          next_run_at: string | null
          objectives: string[]
          organization_id: string
          primary_language: string
          region: string | null
          schedule_frequency: string
          secondary_languages: string[]
          services: string[]
          settings: Json
          status: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          brand_name: string
          brand_variants?: string[]
          business_description?: string | null
          country?: string
          created_at?: string
          created_by: string
          domain: string
          gsc_property_url?: string | null
          gsc_status?: string
          id?: string
          next_run_at?: string | null
          objectives?: string[]
          organization_id: string
          primary_language?: string
          region?: string | null
          schedule_frequency?: string
          secondary_languages?: string[]
          services?: string[]
          settings?: Json
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string
          brand_variants?: string[]
          business_description?: string | null
          country?: string
          created_at?: string
          created_by?: string
          domain?: string
          gsc_property_url?: string | null
          gsc_status?: string
          id?: string
          next_run_at?: string | null
          objectives?: string[]
          organization_id?: string
          primary_language?: string
          region?: string | null
          schedule_frequency?: string
          secondary_languages?: string[]
          services?: string[]
          settings?: Json
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_prompts: {
        Row: {
          active: boolean
          approved_at: string | null
          approved_by: string | null
          country: string
          created_at: string
          created_by: string
          id: string
          language: string
          project_id: string
          question: string
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          country?: string
          created_at?: string
          created_by: string
          id?: string
          language?: string
          project_id: string
          question: string
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          approved_by?: string | null
          country?: string
          created_at?: string
          created_by?: string
          id?: string
          language?: string
          project_id?: string
          question?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_recommendations: {
        Row: {
          created_at: string
          created_by: string | null
          evidence: string
          id: string
          impact: string
          nexaro_task_id: string | null
          priority: string
          project_id: string
          reason: string
          related_prompt_ids: string[]
          related_response_ids: string[]
          run_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence: string
          id?: string
          impact: string
          nexaro_task_id?: string | null
          priority: string
          project_id: string
          reason: string
          related_prompt_ids?: string[]
          related_response_ids?: string[]
          run_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence?: string
          id?: string
          impact?: string
          nexaro_task_id?: string | null
          priority?: string
          project_id?: string
          reason?: string
          related_prompt_ids?: string[]
          related_response_ids?: string[]
          run_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_recommendations_nexaro_task_id_fkey"
            columns: ["nexaro_task_id"]
            isOneToOne: false
            referencedRelation: "nexaro_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_reports: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          period_end: string | null
          period_start: string | null
          project_id: string
          run_id: string | null
          snapshot: Json
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          project_id: string
          run_id?: string | null
          snapshot?: Json
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string
          run_id?: string | null
          snapshot?: Json
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_responses: {
        Row: {
          confidence: number | null
          country: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          language: string
          model: string | null
          model_version: string | null
          needs_review: boolean
          original_response: string | null
          output_tokens: number | null
          prompt_id: string
          provider: string
          raw_metadata: Json
          run_id: string
          sentiment: string | null
          status: string
        }
        Insert: {
          confidence?: number | null
          country: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          language: string
          model?: string | null
          model_version?: string | null
          needs_review?: boolean
          original_response?: string | null
          output_tokens?: number | null
          prompt_id: string
          provider: string
          raw_metadata?: Json
          run_id: string
          sentiment?: string | null
          status: string
        }
        Update: {
          confidence?: number | null
          country?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          language?: string
          model?: string | null
          model_version?: string | null
          needs_review?: boolean
          original_response?: string | null
          output_tokens?: number | null
          prompt_id?: string
          provider?: string
          raw_metadata?: Json
          run_id?: string
          sentiment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "visibility_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_responses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_summary: string | null
          id: string
          idempotency_key: string
          project_id: string
          requested_providers: string[]
          started_at: string | null
          status: string
          trigger_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_summary?: string | null
          id?: string
          idempotency_key: string
          project_id: string
          requested_providers?: string[]
          started_at?: string | null
          status?: string
          trigger_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_summary?: string | null
          id?: string
          idempotency_key?: string
          project_id?: string
          requested_providers?: string[]
          started_at?: string | null
          status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_usage_events: {
        Row: {
          created_at: string
          estimated_cost: number | null
          event_type: string
          id: string
          input_tokens: number | null
          metadata: Json
          output_tokens: number | null
          project_id: string
          provider: string
          quantity: number
          run_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost?: number | null
          event_type: string
          id?: string
          input_tokens?: number | null
          metadata?: Json
          output_tokens?: number | null
          project_id: string
          provider: string
          quantity?: number
          run_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost?: number | null
          event_type?: string
          id?: string
          input_tokens?: number | null
          metadata?: Json
          output_tokens?: number | null
          project_id?: string
          provider?: string
          quantity?: number
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visibility_usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "visibility_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_usage_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_register_company: {
        Args: {
          p_company_name: string
          p_contact_name: string
          p_email: string
        }
        Returns: string
      }
    }
    Enums: {
      organization_role:
        | "owner"
        | "collaborator"
        | "nexaro_consultant"
        | "nexaro_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      organization_role: [
        "owner",
        "collaborator",
        "nexaro_consultant",
        "nexaro_admin",
      ],
    },
  },
} as const
