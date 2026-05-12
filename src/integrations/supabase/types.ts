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
      appointments: {
        Row: {
          clinic: string | null
          created_at: string
          doctor_name: string | null
          family_member_id: string | null
          id: string
          notes: string | null
          reason: string | null
          scheduled_at: string
          specialist_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic?: string | null
          created_at?: string
          doctor_name?: string | null
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          scheduled_at: string
          specialist_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic?: string | null
          created_at?: string
          doctor_name?: string | null
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          scheduled_at?: string
          specialist_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_color: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          name: string
          notes: string | null
          relation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          name: string
          notes?: string | null
          relation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          name?: string
          notes?: string | null
          relation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          inputs_snapshot: Json | null
          observations: Json | null
          recommendations: Json | null
          summary: string
          trends: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          inputs_snapshot?: Json | null
          observations?: Json | null
          recommendations?: Json | null
          summary: string
          trends?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          inputs_snapshot?: Json | null
          observations?: Json | null
          recommendations?: Json | null
          summary?: string
          trends?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      lifestyle_logs: {
        Row: {
          created_at: string
          diet_quality: number | null
          exercise_minutes: number | null
          id: string
          log_date: string
          notes: string | null
          sleep_hours: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
          water_glasses: number | null
        }
        Insert: {
          created_at?: string
          diet_quality?: number | null
          exercise_minutes?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
          water_glasses?: number | null
        }
        Update: {
          created_at?: string
          diet_quality?: number | null
          exercise_minutes?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          sleep_hours?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
          water_glasses?: number | null
        }
        Relationships: []
      }
      medical_reports: {
        Row: {
          abnormalities: Json | null
          ai_analysis: Json | null
          created_at: string
          extracted_values: Json | null
          family_member_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          mime_type: string | null
          raw_text: string | null
          report_date: string | null
          report_type: string | null
          source_type: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abnormalities?: Json | null
          ai_analysis?: Json | null
          created_at?: string
          extracted_values?: Json | null
          family_member_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          report_date?: string | null
          report_type?: string | null
          source_type?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abnormalities?: Json | null
          ai_analysis?: Json | null
          created_at?: string
          extracted_values?: Json | null
          family_member_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          report_date?: string | null
          report_type?: string | null
          source_type?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_reports_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          ai_explanation: string | null
          created_at: string
          doctor_name: string | null
          family_member_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          medicines: Json | null
          mime_type: string | null
          prescribed_date: string | null
          raw_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string
          doctor_name?: string | null
          family_member_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          medicines?: Json | null
          mime_type?: string | null
          prescribed_date?: string | null
          raw_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string
          doctor_name?: string | null
          family_member_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          medicines?: Json | null
          mime_type?: string | null
          prescribed_date?: string | null
          raw_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          label: string
          report_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          label?: string
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          label?: string
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_raw: Json | null
          color_features: Json | null
          condition: string
          confidence: number
          created_at: string
          family_member_id: string | null
          id: string
          image_path: string
          ml_predictions: Json | null
          observations: string | null
          recommendation: string | null
          region: string
          severity: string
          trend: string | null
          user_id: string
        }
        Insert: {
          ai_raw?: Json | null
          color_features?: Json | null
          condition: string
          confidence?: number
          created_at?: string
          family_member_id?: string | null
          id?: string
          image_path: string
          ml_predictions?: Json | null
          observations?: string | null
          recommendation?: string | null
          region: string
          severity: string
          trend?: string | null
          user_id: string
        }
        Update: {
          ai_raw?: Json | null
          color_features?: Json | null
          condition?: string
          confidence?: number
          created_at?: string
          family_member_id?: string | null
          id?: string
          image_path?: string
          ml_predictions?: Json | null
          observations?: string | null
          recommendation?: string | null
          region?: string
          severity?: string
          trend?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_diary: {
        Row: {
          created_at: string
          dryness: number
          entry_date: string
          id: string
          irritation: number
          itch: number
          notes: string | null
          pain: number
          products_used: string[] | null
          redness: number
          swelling: number
          triggers: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dryness?: number
          entry_date?: string
          id?: string
          irritation?: number
          itch?: number
          notes?: string | null
          pain?: number
          products_used?: string[] | null
          redness?: number
          swelling?: number
          triggers?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dryness?: number
          entry_date?: string
          id?: string
          irritation?: number
          itch?: number
          notes?: string | null
          pain?: number
          products_used?: string[] | null
          redness?: number
          swelling?: number
          triggers?: string[] | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
