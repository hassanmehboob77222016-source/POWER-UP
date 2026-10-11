export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string }
        Insert: { id: string; display_name: string; avatar_url?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; display_name?: string; avatar_url?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      backup_plans: {
        Row: { id: string; user_id: string; plan_name: string; backup_configuration: Json; selected_appliances: Json; calculation_results: Json; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; plan_name: string; backup_configuration: Json; selected_appliances?: Json; calculation_results: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; plan_name?: string; backup_configuration?: Json; selected_appliances?: Json; calculation_results?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      feedback: {
        Row: { id: string; user_id: string; rating: number | null; comment: string; feedback_type: 'general' | 'bug' | 'feature' | 'suggestion'; status: 'pending' | 'approved' | 'rejected'; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; rating?: number | null; comment: string; feedback_type?: 'general' | 'bug' | 'feature' | 'suggestion'; status?: 'pending' | 'approved' | 'rejected'; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; rating?: number | null; comment?: string; feedback_type?: 'general' | 'bug' | 'feature' | 'suggestion'; status?: 'pending' | 'approved' | 'rejected'; created_at?: string; updated_at?: string }
        Relationships: []
      }
      admin_users: {
        Row: { user_id: string; created_at: string }
        Insert: { user_id: string; created_at?: string }
        Update: { user_id?: string; created_at?: string }
        Relationships: []
      }
      ai_chat_usage: {
        Row: { id: number; user_id: string; created_at: string }
        Insert: { id?: number; user_id: string; created_at?: string }
        Update: { id?: number; user_id?: string; created_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_feedback: { Args: Record<string, never>; Returns: { id: string; rating: number | null; comment: string; feedback_type: string; status: string; created_at: string }[] }
      is_feedback_admin: { Args: Record<string, never>; Returns: boolean }
      consume_ai_chat_quota: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
