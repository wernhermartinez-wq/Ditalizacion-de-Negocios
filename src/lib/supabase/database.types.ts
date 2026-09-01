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
        Relationships: [{ foreignKeyName: "company_registrations_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }]
      }
      diagnostic_question_dependencies: {
        Row: { child_question_id: string; max_value: number; min_value: number; parent_question_id: string }
        Insert: { child_question_id: string; max_value?: number; min_value?: number; parent_question_id: string }
        Update: { child_question_id?: string; max_value?: number; min_value?: number; parent_question_id?: string }
        Relationships: [
          { foreignKeyName: "diagnostic_question_dependencies_child_question_id_fkey"; columns: ["child_question_id"]; isOneToOne: false; referencedRelation: "diagnostic_questions"; referencedColumns: ["id"] },
          { foreignKeyName: "diagnostic_question_dependencies_parent_question_id_fkey"; columns: ["parent_question_id"]; isOneToOne: false; referencedRelation: "diagnostic_questions"; referencedColumns: ["id"] },
        ]
      }
      diagnostic_questionnaires: {
        Row: { created_at: string; description: string; id: string; is_active: boolean; slug: string; title: string; version: number }
        Insert: { created_at?: string; description: string; id?: string; is_active?: boolean; slug: string; title: string; version: number }
        Update: { created_at?: string; description?: string; id?: string; is_active?: boolean; slug?: string; title?: string; version?: number }
        Relationships: []
      }
      diagnostic_questions: {
        Row: { dependency_mode: string; dimension: string; evidence_examples: string | null; guidance: string | null; id: string; position: number; prompt: string; questionnaire_id: string; required: boolean }
        Insert: { dependency_mode?: string; dimension: string; evidence_examples?: string | null; guidance?: string | null; id?: string; position: number; prompt: string; questionnaire_id: string; required?: boolean }
        Update: { dependency_mode?: string; dimension?: string; evidence_examples?: string | null; guidance?: string | null; id?: string; position?: number; prompt?: string; questionnaire_id?: string; required?: boolean }
        Relationships: [{ foreignKeyName: "diagnostic_questions_questionnaire_id_fkey"; columns: ["questionnaire_id"]; isOneToOne: false; referencedRelation: "diagnostic_questionnaires"; referencedColumns: ["id"] }]
      }
      diagnostic_responses: {
        Row: { answered_by: string; diagnostic_id: string; question_id: string; updated_at: string; value: number }
        Insert: { answered_by: string; diagnostic_id: string; question_id: string; updated_at?: string; value: number }
        Update: { answered_by?: string; diagnostic_id?: string; question_id?: string; updated_at?: string; value?: number }
        Relationships: [
          { foreignKeyName: "diagnostic_responses_diagnostic_id_fkey"; columns: ["diagnostic_id"]; isOneToOne: false; referencedRelation: "diagnostics"; referencedColumns: ["id"] },
          { foreignKeyName: "diagnostic_responses_question_id_fkey"; columns: ["question_id"]; isOneToOne: false; referencedRelation: "diagnostic_questions"; referencedColumns: ["id"] },
        ]
      }
      diagnostics: {
        Row: { completed_at: string | null; created_at: string; id: string; organization_id: string; provisional_score: number | null; questionnaire_id: string; started_by: string; status: string; updated_at: string }
        Insert: { completed_at?: string | null; created_at?: string; id?: string; organization_id: string; provisional_score?: number | null; questionnaire_id: string; started_by: string; status?: string; updated_at?: string }
        Update: { completed_at?: string | null; created_at?: string; id?: string; organization_id?: string; provisional_score?: number | null; questionnaire_id?: string; started_by?: string; status?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "diagnostics_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "diagnostics_questionnaire_id_fkey"; columns: ["questionnaire_id"]; isOneToOne: false; referencedRelation: "diagnostic_questionnaires"; referencedColumns: ["id"] },
        ]
      }
      nexaro_work_entries: {
        Row: { category: string; completed_on: string; created_at: string; created_by: string; description: string | null; id: string; organization_id: string; title: string; updated_at: string }
        Insert: { category: string; completed_on?: string; created_at?: string; created_by: string; description?: string | null; id?: string; organization_id: string; title: string; updated_at?: string }
        Update: { category?: string; completed_on?: string; created_at?: string; created_by?: string; description?: string | null; id?: string; organization_id?: string; title?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "nexaro_work_entries_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }]
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
        Row: { granted_at: string; granted_by: string | null; user_id: string }
        Insert: { granted_at?: string; granted_by?: string | null; user_id: string }
        Update: { granted_at?: string; granted_by?: string | null; user_id?: string }
        Relationships: []
      }
      platform_users: {
        Row: { email: string | null; last_sign_in_at: string | null; registered_at: string; updated_at: string; user_id: string }
        Insert: { email?: string | null; last_sign_in_at?: string | null; registered_at: string; updated_at?: string; user_id: string }
        Update: { email?: string | null; last_sign_in_at?: string | null; registered_at?: string; updated_at?: string; user_id?: string }
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_register_company: {
        Args: { p_company_name: string; p_contact_name: string; p_email: string }
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
      organization_role: [
        "owner",
        "collaborator",
        "nexaro_consultant",
        "nexaro_admin",
      ],
    },
  },
} as const
