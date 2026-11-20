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
      entity_audit_cases: {
        Row: {
          activated_at: string
          activated_by: string | null
          activation_source: string
          created_at: string
          current_identity_version_id: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by?: string | null
          activation_source: string
          created_at?: string
          current_identity_version_id?: string | null
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string | null
          activation_source?: string
          created_at?: string
          current_identity_version_id?: string | null
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_audit_cases_current_identity_version_fkey"
            columns: ["current_identity_version_id"]
            isOneToOne: false
            referencedRelation: "entity_identity_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_audit_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_audit_campaigns: {
        Row: {
          campaign_number: number
          case_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          custom_question_set_id: string | null
          id: string
          idempotency_key: string
          identity_version_id: string
          organization_id: string
          query_budget: number
          requested_providers: string[]
          standard_question_set_id: string
          started_at: string | null
          status: string
          visibility_project_id: string
          visibility_run_id: string | null
        }
        Insert: {
          campaign_number: number
          case_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          custom_question_set_id?: string | null
          id?: string
          idempotency_key: string
          identity_version_id: string
          organization_id: string
          query_budget?: number
          requested_providers?: string[]
          standard_question_set_id: string
          started_at?: string | null
          status?: string
          visibility_project_id: string
          visibility_run_id?: string | null
        }
        Update: {
          campaign_number?: number
          case_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          custom_question_set_id?: string | null
          id?: string
          idempotency_key?: string
          identity_version_id?: string
          organization_id?: string
          query_budget?: number
          requested_providers?: string[]
          standard_question_set_id?: string
          started_at?: string | null
          status?: string
          visibility_project_id?: string
          visibility_run_id?: string | null
        }
        Relationships: []
      }
      entity_audit_evaluation_budgets: {
        Row: {
          budget_usd: number
          campaign_id: string
          created_at: string
          organization_id: string
          reserved_usd: number
          spent_usd: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_usd?: number
          campaign_id: string
          created_at?: string
          organization_id: string
          reserved_usd?: number
          spent_usd?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_usd?: number
          campaign_id?: string
          created_at?: string
          organization_id?: string
          reserved_usd?: number
          spent_usd?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      entity_audit_evaluation_runs: {
        Row: {
          actual_cost_usd: number | null
          campaign_id: string
          completed_at: string | null
          cost_basis: string | null
          created_at: string
          created_by: string
          error_message: string | null
          estimated_cost_usd: number
          id: string
          idempotency_key: string
          identity_version_id: string
          input_tokens: number | null
          model: string
          organization_id: string
          output_tokens: number | null
          started_at: string
          status: string
        }
        Insert: {
          actual_cost_usd?: number | null
          campaign_id: string
          completed_at?: string | null
          cost_basis?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          estimated_cost_usd: number
          id?: string
          idempotency_key: string
          identity_version_id: string
          input_tokens?: number | null
          model: string
          organization_id: string
          output_tokens?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          actual_cost_usd?: number | null
          campaign_id?: string
          completed_at?: string | null
          cost_basis?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          idempotency_key?: string
          identity_version_id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string
          output_tokens?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      entity_audit_factual_claims: {
        Row: {
          assertion_text: string
          campaign_id: string
          claim_fingerprint: string
          classification: string
          created_at: string
          evaluation_run_id: string
          evidence_text: string
          field_key: string
          finding_key: string | null
          id: string
          identity_evidence: Json
          organization_id: string
          original_response: string
          provider: string
          response_id: string
        }
        Insert: {
          assertion_text: string
          campaign_id: string
          claim_fingerprint: string
          classification: string
          created_at?: string
          evaluation_run_id: string
          evidence_text: string
          field_key: string
          finding_key?: string | null
          id?: string
          identity_evidence?: Json
          organization_id: string
          original_response: string
          provider: string
          response_id: string
        }
        Update: {
          assertion_text?: string
          campaign_id?: string
          claim_fingerprint?: string
          classification?: string
          created_at?: string
          evaluation_run_id?: string
          evidence_text?: string
          field_key?: string
          finding_key?: string | null
          id?: string
          identity_evidence?: Json
          organization_id?: string
          original_response?: string
          provider?: string
          response_id?: string
        }
        Relationships: []
      }
      entity_audit_findings: {
        Row: {
          campaign_id: string
          classification: string
          created_at: string
          evaluation_run_id: string
          evidence_summary: string
          field_key: string
          finding_key: string
          id: string
          organization_id: string
          provider_count: number
          response_count: number
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          classification: string
          created_at?: string
          evaluation_run_id: string
          evidence_summary: string
          field_key: string
          finding_key: string
          id?: string
          organization_id: string
          provider_count?: number
          response_count?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          classification?: string
          created_at?: string
          evaluation_run_id?: string
          evidence_summary?: string
          field_key?: string
          finding_key?: string
          id?: string
          organization_id?: string
          provider_count?: number
          response_count?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_audit_finding_reviews: {
        Row: {
          finding_id: string
          internal_note: string | null
          organization_id: string
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          finding_id: string
          internal_note?: string | null
          organization_id: string
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          finding_id?: string
          internal_note?: string | null
          organization_id?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: []
      }
      entity_audit_intervention_proposals: {
        Row: {
          client_summary: string | null
          client_visible: boolean
          created_at: string
          created_by: string
          expected_result: string
          hypothesis: string | null
          id: string
          internal_note: string | null
          linked_at: string | null
          linked_by: string | null
          linked_task_id: string | null
          organization_id: string
          phase: number
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          suggested_action: string
          updated_at: string
          verified_problem: string
        }
        Insert: {
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by: string
          expected_result: string
          hypothesis?: string | null
          id?: string
          internal_note?: string | null
          linked_at?: string | null
          linked_by?: string | null
          linked_task_id?: string | null
          organization_id: string
          phase: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_action: string
          updated_at?: string
          verified_problem: string
        }
        Update: {
          client_summary?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string
          expected_result?: string
          hypothesis?: string | null
          id?: string
          internal_note?: string | null
          linked_at?: string | null
          linked_by?: string | null
          linked_task_id?: string | null
          organization_id?: string
          phase?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_action?: string
          updated_at?: string
          verified_problem?: string
        }
        Relationships: []
      }
      entity_audit_proposal_findings: {
        Row: {
          campaign_id: string
          classification: string
          created_at: string
          evidence_snapshot: string
          finding_id: string
          identity_version_id: string
          organization_id: string
          proposal_id: string
          verified_fact: string
        }
        Insert: {
          campaign_id: string
          classification: string
          created_at?: string
          evidence_snapshot: string
          finding_id: string
          identity_version_id: string
          organization_id: string
          proposal_id: string
          verified_fact: string
        }
        Update: {
          campaign_id?: string
          classification?: string
          created_at?: string
          evidence_snapshot?: string
          finding_id?: string
          identity_version_id?: string
          organization_id?: string
          proposal_id?: string
          verified_fact?: string
        }
        Relationships: []
      }
      entity_audit_campaign_questions: {
        Row: {
          campaign_id: string
          category: string
          created_at: string
          id: string
          position: number
          question_text: string
          source_question_id: string
          source_type: string
          visibility_prompt_id: string
        }
        Insert: {
          campaign_id: string
          category: string
          created_at?: string
          id?: string
          position: number
          question_text: string
          source_question_id: string
          source_type: string
          visibility_prompt_id: string
        }
        Update: {
          campaign_id?: string
          category?: string
          created_at?: string
          id?: string
          position?: number
          question_text?: string
          source_question_id?: string
          source_type?: string
          visibility_prompt_id?: string
        }
        Relationships: []
      }
      entity_audit_question_sets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          set_type: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          set_type: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          set_type?: string
          version_number?: number
        }
        Relationships: []
      }
      entity_audit_questions: {
        Row: {
          category: string
          code: string
          country: string
          created_at: string
          id: string
          language: string
          position: number
          prompt_template: string
          question_set_id: string
        }
        Insert: {
          category: string
          code: string
          country?: string
          created_at?: string
          id?: string
          language?: string
          position: number
          prompt_template: string
          question_set_id: string
        }
        Update: {
          category?: string
          code?: string
          country?: string
          created_at?: string
          id?: string
          language?: string
          position?: number
          prompt_template?: string
          question_set_id?: string
        }
        Relationships: []
      }
      entity_identity_versions: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          case_id: string
          categories: string[]
          city: string | null
          commercial_name: string
          contact_url: string | null
          country_code: string
          created_at: string
          created_by: string | null
          domain: string | null
          external_identifiers: Json
          id: string
          latitude: number | null
          legal_name: string | null
          longitude: number | null
          menu_url: string | null
          name_variants: string[]
          official_profiles: Json
          opening_hours: Json
          phone: string | null
          postal_code: string | null
          region: string | null
          reservation_url: string | null
          services: string[]
          specialties: string[]
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_note: string | null
          version_number: number
          website_url: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          case_id: string
          categories?: string[]
          city?: string | null
          commercial_name: string
          contact_url?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          domain?: string | null
          external_identifiers?: Json
          id?: string
          latitude?: number | null
          legal_name?: string | null
          longitude?: number | null
          menu_url?: string | null
          name_variants?: string[]
          official_profiles?: Json
          opening_hours?: Json
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          reservation_url?: string | null
          services?: string[]
          specialties?: string[]
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          version_number: number
          website_url?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          case_id?: string
          categories?: string[]
          city?: string | null
          commercial_name?: string
          contact_url?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          domain?: string | null
          external_identifiers?: Json
          id?: string
          latitude?: number | null
          legal_name?: string | null
          longitude?: number | null
          menu_url?: string | null
          name_variants?: string[]
          official_profiles?: Json
          opening_hours?: Json
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          reservation_url?: string | null
          services?: string[]
          specialties?: string[]
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          version_number?: number
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_identity_versions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "entity_audit_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_observations: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          field_key: string
          id: string
          internal_note: string | null
          normalized_value: Json | null
          observation_kind: string
          observed_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          status: string
          updated_at: string
          value: Json
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          field_key: string
          id?: string
          internal_note?: string | null
          normalized_value?: Json | null
          observation_kind: string
          observed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          value: Json
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          field_key?: string
          id?: string
          internal_note?: string | null
          normalized_value?: Json | null
          observation_kind?: string
          observed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "entity_observations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "entity_audit_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_observations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "entity_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_sources: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          external_identifier: string | null
          id: string
          last_checked_at: string | null
          name: string
          source_type: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          external_identifier?: string | null
          id?: string
          last_checked_at?: string | null
          name: string
          source_type: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          external_identifier?: string | null
          id?: string
          last_checked_at?: string | null
          name?: string
          source_type?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_sources_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "entity_audit_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_attempts: {
        Row: {
          action: string
          created_at: string
          email: string
          id: number
          ip: string
        }
        Insert: {
          action: string
          created_at?: string
          email: string
          id?: never
          ip: string
        }
        Update: {
          action?: string
          created_at?: string
          email?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      assessment_scores: {
        Row: {
          assessment_id: string
          created_at: string
          dimension_id: string
          formula_version: string
          id: string
          nivel: string
          score: number | null
          tipo_resultado: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          dimension_id: string
          formula_version: string
          id?: string
          nivel: string
          score?: number | null
          tipo_resultado: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          dimension_id?: string
          formula_version?: string
          id?: string
          nivel?: string
          score?: number | null
          tipo_resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
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
      course_assignments: {
        Row: {
          assessment_id: string | null
          assigned_by: string
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          organization_id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          assigned_by: string
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          assigned_by?: string
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_competencies: {
        Row: {
          competency: string
          course_id: string
          created_at: string
          dimension_id: string
        }
        Insert: {
          competency: string
          course_id: string
          created_at?: string
          dimension_id: string
        }
        Update: {
          competency?: string
          course_id?: string
          created_at?: string
          dimension_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_competencies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          assignment_id: string
          completed_at: string | null
          evaluation: string | null
          evidence: string | null
          percentage: number
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          evaluation?: string | null
          evidence?: string | null
          percentage?: number
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          evaluation?: string | null
          evidence?: string | null
          percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          level: string
          modality: string
          provider: string
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          level: string
          modality: string
          provider?: string
          slug: string
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          level?: string
          modality?: string
          provider?: string
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
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
          response_type: string
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
          response_type?: string
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
          response_type?: string
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
          details: Json
          diagnostic_id: string
          question_id: string
          updated_at: string
          value: number
        }
        Insert: {
          answered_by: string
          details?: Json
          diagnostic_id: string
          question_id: string
          updated_at?: string
          value: number
        }
        Update: {
          answered_by?: string
          details?: Json
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
          validated_at: string | null
          validated_by: string | null
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
          validated_at?: string | null
          validated_by?: string | null
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
          validated_at?: string | null
          validated_by?: string | null
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
      roadmap_items: {
        Row: {
          actions: Json
          code: string
          color: string
          created_at: string
          dimension_id: string
          dimension_name: string
          id: string
          objective: string
          period: string
          phase: number
          position: number
          priority: string
          roadmap_id: string
          score: number
          success: string
          title: string
          weaknesses: Json
        }
        Insert: {
          actions: Json
          code: string
          color: string
          created_at?: string
          dimension_id: string
          dimension_name: string
          id?: string
          objective: string
          period: string
          phase: number
          position: number
          priority: string
          roadmap_id: string
          score: number
          success: string
          title: string
          weaknesses: Json
        }
        Update: {
          actions?: Json
          code?: string
          color?: string
          created_at?: string
          dimension_id?: string
          dimension_name?: string
          id?: string
          objective?: string
          period?: string
          phase?: number
          position?: number
          priority?: string
          roadmap_id?: string
          score?: number
          success?: string
          title?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
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
      roadmaps: {
        Row: {
          assessment_id: string
          formula_version: string
          id: string
          organization_id: string
          validated_at: string
          validated_by: string
        }
        Insert: {
          assessment_id: string
          formula_version: string
          id?: string
          organization_id: string
          validated_at?: string
          validated_by: string
        }
        Update: {
          assessment_id?: string
          formula_version?: string
          id?: string
          organization_id?: string
          validated_at?: string
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_catalog: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          access_enabled: boolean
          cancel_at_period_end: boolean
          created_at: string
          id: string
          last_stripe_event_created: number
          next_billing_at: string | null
          organization_id: string
          past_due_since: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_enabled?: boolean
          cancel_at_period_end?: boolean
          created_at?: string
          id?: string
          last_stripe_event_created?: number
          next_billing_at?: string | null
          organization_id: string
          past_due_since?: string | null
          status: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_enabled?: boolean
          cancel_at_period_end?: boolean
          created_at?: string
          id?: string
          last_stripe_event_created?: number
          next_billing_at?: string | null
          organization_id?: string
          past_due_since?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          error_message: string | null
          event_created: number
          event_type: string
          processed_at: string | null
          received_at: string
          status: string
          stripe_event_id: string
        }
        Insert: {
          error_message?: string | null
          event_created: number
          event_type: string
          processed_at?: string | null
          received_at?: string
          status: string
          stripe_event_id: string
        }
        Update: {
          error_message?: string | null
          event_created?: number
          event_type?: string
          processed_at?: string | null
          received_at?: string
          status?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      tool_integrations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_verified_at: string | null
          method: string
          organization_id: string
          source_tool_id: string
          status: string
          target_tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_verified_at?: string | null
          method: string
          organization_id: string
          source_tool_id: string
          status?: string
          target_tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_verified_at?: string | null
          method?: string
          organization_id?: string
          source_tool_id?: string
          status?: string
          target_tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_integrations_source_tool_id_organization_id_fkey"
            columns: ["source_tool_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_tools"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tool_integrations_target_tool_id_organization_id_fkey"
            columns: ["target_tool_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_tools"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_tools: {
        Row: {
          business_area: string
          category: string
          created_at: string
          created_by: string
          criticality: string
          currency: string
          custom_name: string | null
          custom_provider: string | null
          id: string
          monthly_cost: number
          organization_id: string
          owner_name: string | null
          status: string
          tool_id: string | null
          updated_at: string
          usage_purpose: string
          user_count: number | null
          verified_at: string | null
        }
        Insert: {
          business_area: string
          category: string
          created_at?: string
          created_by: string
          criticality?: string
          currency?: string
          custom_name?: string | null
          custom_provider?: string | null
          id?: string
          monthly_cost?: number
          organization_id: string
          owner_name?: string | null
          status?: string
          tool_id?: string | null
          updated_at?: string
          usage_purpose: string
          user_count?: number | null
          verified_at?: string | null
        }
        Update: {
          business_area?: string
          category?: string
          created_at?: string
          created_by?: string
          criticality?: string
          currency?: string
          custom_name?: string | null
          custom_provider?: string | null
          id?: string
          monthly_cost?: number
          organization_id?: string
          owner_name?: string | null
          status?: string
          tool_id?: string | null
          updated_at?: string
          usage_purpose?: string
          user_count?: number | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_tools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_catalog"
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
          entity_audit_question_id: string | null
          entity_identity_version_id: string | null
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
          entity_audit_question_id?: string | null
          entity_identity_version_id?: string | null
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
          entity_audit_question_id?: string | null
          entity_identity_version_id?: string | null
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
          client_present: boolean
          confidence: number | null
          country: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          first_mention: boolean | null
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          language: string
          model: string | null
          model_version: string | null
          needs_review: boolean
          original_response: string | null
          ordered_position: number | null
          output_tokens: number | null
          prompt_id: string
          provider: string
          raw_metadata: Json
          response_structure: string | null
          run_id: string
          sentiment: string | null
          status: string
        }
        Insert: {
          client_present?: boolean
          confidence?: number | null
          country: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          first_mention?: boolean | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          language: string
          model?: string | null
          model_version?: string | null
          needs_review?: boolean
          original_response?: string | null
          ordered_position?: number | null
          output_tokens?: number | null
          prompt_id: string
          provider: string
          raw_metadata?: Json
          response_structure?: string | null
          run_id: string
          sentiment?: string | null
          status: string
        }
        Update: {
          client_present?: boolean
          confidence?: number | null
          country?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          first_mention?: boolean | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          language?: string
          model?: string | null
          model_version?: string | null
          needs_review?: boolean
          original_response?: string | null
          ordered_position?: number | null
          output_tokens?: number | null
          prompt_id?: string
          provider?: string
          raw_metadata?: Json
          response_structure?: string | null
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
          entity_audit_campaign_id: string | null
          entity_identity_version_id: string | null
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
          entity_audit_campaign_id?: string | null
          entity_identity_version_id?: string | null
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
          entity_audit_campaign_id?: string | null
          entity_identity_version_id?: string | null
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
      complete_entity_audit_factual_evaluation: {
        Args: {
          p_actual_cost_usd: number
          p_claims: Json
          p_evaluation_run_id: string
          p_findings: Json
          p_input_tokens: number
          p_output_tokens: number
        }
        Returns: undefined
      }
      create_entity_audit_custom_question_set: {
        Args: { p_organization_id: string; p_questions: Json }
        Returns: string
      }
      create_entity_audit_intervention_proposal: {
        Args: {
          p_created_by: string
          p_expected_result: string
          p_finding_ids: string[]
          p_hypothesis: string | null
          p_internal_note: string | null
          p_organization_id: string
          p_phase: number
          p_suggested_action: string
          p_verified_problem: string
        }
        Returns: string
      }
      ensure_entity_audit_case: {
        Args: {
          p_activated_by: string | null
          p_activation_source: string
          p_categories?: string[]
          p_city?: string | null
          p_commercial_name: string
          p_country_code?: string
          p_domain?: string | null
          p_legal_name?: string | null
          p_organization_id: string
          p_website_url?: string | null
        }
        Returns: string
      }
      fail_entity_audit_factual_evaluation: {
        Args: { p_error_message: string; p_evaluation_run_id: string }
        Returns: undefined
      }
      link_entity_audit_proposal_to_task: {
        Args: { p_proposal_id: string; p_task_id: string }
        Returns: undefined
      }
      prepare_entity_audit_campaign: {
        Args: { p_idempotency_key: string; p_organization_id: string }
        Returns: Json
      }
      reserve_entity_audit_factual_evaluation: {
        Args: {
          p_campaign_id: string
          p_created_by: string
          p_estimated_cost_usd: number
          p_idempotency_key: string
          p_model: string
        }
        Returns: Json
      }
      validate_entity_identity_version: {
        Args: { p_validation_note?: string; p_version_id: string }
        Returns: string
      }
      admin_register_company: {
        Args: {
          p_company_name: string
          p_contact_name: string
          p_email: string
        }
        Returns: string
      }
      update_course_progress: {
        Args: {
          p_assignment_id: string
          p_evaluation?: string
          p_evidence?: string
          p_percentage: number
        }
        Returns: undefined
      }
      validate_diagnostic_snapshot: {
        Args: {
          p_diagnostic_id: string
          p_formula_version: string
          p_roadmap: Json
          p_scores: Json
        }
        Returns: undefined
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
