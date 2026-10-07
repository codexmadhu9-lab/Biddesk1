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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          category: string | null
          created_at: string
          id: string
          keyword: string | null
          min_fit: number | null
          min_value_cr: number | null
          name: string
          state: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          min_fit?: number | null
          min_value_cr?: number | null
          name: string
          state?: string | null
          user_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          keyword?: string | null
          min_fit?: number | null
          min_value_cr?: number | null
          name?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      awards: {
        Row: {
          awarded_cr: number
          awarded_on: string
          bidders: number
          buyer: string
          category: string
          estimated_cr: number
          id: string
          payment_days: number
          state: string
          title: string
          winner_id: string
        }
        Insert: {
          awarded_cr: number
          awarded_on: string
          bidders: number
          buyer: string
          category: string
          estimated_cr: number
          id?: string
          payment_days: number
          state: string
          title: string
          winner_id: string
        }
        Update: {
          awarded_cr?: number
          awarded_on?: string
          bidders?: number
          buyer?: string
          category?: string
          estimated_cr?: number
          id?: string
          payment_days?: number
          state?: string
          title?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_tasks: {
        Row: {
          assignee: string | null
          bid_id: string
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          bid_id: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          assignee?: string | null
          bid_id?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_tasks_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quoted_value_cr: number | null
          stage: string
          tender_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quoted_value_cr?: number | null
          stage?: string
          tender_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quoted_value_cr?: number | null
          stage?: string
          tender_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          created_at: string
          doc_type: string
          expiry_date: string | null
          file_path: string | null
          file_size: number | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          expiry_date?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expiry_date?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      competitors: {
        Row: {
          categories: string[]
          description: string
          hq_state: string
          id: string
          is_msme: boolean
          name: string
          pricing_style: string
          turnover_cr: number
        }
        Insert: {
          categories: string[]
          description: string
          hq_state: string
          id?: string
          is_msme?: boolean
          name: string
          pricing_style: string
          turnover_cr: number
        }
        Update: {
          categories?: string[]
          description?: string
          hq_state?: string
          id?: string
          is_msme?: boolean
          name?: string
          pricing_style?: string
          turnover_cr?: number
        }
        Relationships: []
      }
      guarantees: {
        Row: {
          amount_lakh: number
          bank: string
          beneficiary: string
          created_at: string
          expiry_date: string
          id: string
          instrument_no: string | null
          issued_on: string
          kind: string
          status: string
          tender_id: string | null
          user_id: string
        }
        Insert: {
          amount_lakh: number
          bank: string
          beneficiary: string
          created_at?: string
          expiry_date: string
          id?: string
          instrument_no?: string | null
          issued_on?: string
          kind?: string
          status?: string
          tender_id?: string | null
          user_id?: string
        }
        Update: {
          amount_lakh?: number
          bank?: string
          beneficiary?: string
          created_at?: string
          expiry_date?: string
          id?: string
          instrument_no?: string | null
          issued_on?: string
          kind?: string
          status?: string
          tender_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guarantees_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          annual_turnover_cr: number
          categories: string[]
          certifications: string[]
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          industry: string | null
          is_msme: boolean
          onboarded: boolean
          states: string[]
          years_in_business: number
        }
        Insert: {
          annual_turnover_cr?: number
          categories?: string[]
          certifications?: string[]
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          industry?: string | null
          is_msme?: boolean
          onboarded?: boolean
          states?: string[]
          years_in_business?: number
        }
        Update: {
          annual_turnover_cr?: number
          categories?: string[]
          certifications?: string[]
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          is_msme?: boolean
          onboarded?: boolean
          states?: string[]
          years_in_business?: number
        }
        Relationships: []
      }
      tender_analyses: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          tender_id: string
          user_id: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          id?: string
          tender_id: string
          user_id?: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_analyses_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          buyer: string
          category: string
          city: string
          created_at: string
          deadline: string
          description: string
          documents: string[]
          emd_lakh: number
          id: string
          min_experience_yrs: number
          min_turnover_cr: number
          ministry: string
          msme_emd_exempt: boolean
          published_at: string
          ref_no: string
          required_certs: string[]
          source: string
          state: string
          tender_type: string
          title: string
          value_cr: number
        }
        Insert: {
          buyer: string
          category: string
          city: string
          created_at?: string
          deadline: string
          description: string
          documents?: string[]
          emd_lakh: number
          id?: string
          min_experience_yrs?: number
          min_turnover_cr?: number
          ministry: string
          msme_emd_exempt?: boolean
          published_at: string
          ref_no: string
          required_certs?: string[]
          source: string
          state: string
          tender_type?: string
          title: string
          value_cr: number
        }
        Update: {
          buyer?: string
          category?: string
          city?: string
          created_at?: string
          deadline?: string
          description?: string
          documents?: string[]
          emd_lakh?: number
          id?: string
          min_experience_yrs?: number
          min_turnover_cr?: number
          ministry?: string
          msme_emd_exempt?: boolean
          published_at?: string
          ref_no?: string
          required_certs?: string[]
          source?: string
          state?: string
          tender_type?: string
          title?: string
          value_cr?: number
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tender_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
