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
      admin_alerts: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          severity: string
          type: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          severity?: string
          type: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          type?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          previous_value: Json | null
          resource: string
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          resource: string
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          resource?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          memory: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          client_message_id: string | null
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          currency: string
          deal_id: string
          destination_name: string
          end_date: string
          id: string
          nights: number
          people: number
          price_per_person: number
          snapshot: Json
          start_date: string
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deal_id: string
          destination_name: string
          end_date: string
          id?: string
          nights: number
          people: number
          price_per_person: number
          snapshot: Json
          start_date: string
          status?: string
          total_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          deal_id?: string
          destination_name?: string
          end_date?: string
          id?: string
          nights?: number
          people?: number
          price_per_person?: number
          snapshot?: Json
          start_date?: string
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: []
      }
      deal_views: {
        Row: {
          created_at: string
          deal_id: string
          destination_name: string | null
          destination_slug: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          destination_name?: string | null
          destination_slug?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          destination_name?: string | null
          destination_slug?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      destinations: {
        Row: {
          attractions: string[]
          avg_budget_per_person: number
          country: string
          country_code: string
          created_at: string
          flag: string
          flight_hours: number
          has_offers: boolean
          hotels: Json
          is_active: boolean
          is_popular: boolean
          itinerary: string[]
          matches: string[]
          name: string
          region: string
          restaurants: string[]
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
          weather: string
        }
        Insert: {
          attractions?: string[]
          avg_budget_per_person: number
          country: string
          country_code: string
          created_at?: string
          flag: string
          flight_hours: number
          has_offers?: boolean
          hotels?: Json
          is_active?: boolean
          is_popular?: boolean
          itinerary?: string[]
          matches?: string[]
          name: string
          region: string
          restaurants?: string[]
          slug: string
          sort_order?: number
          tagline: string
          updated_at?: string
          weather?: string
        }
        Update: {
          attractions?: string[]
          avg_budget_per_person?: number
          country?: string
          country_code?: string
          created_at?: string
          flag?: string
          flight_hours?: number
          has_offers?: boolean
          hotels?: Json
          is_active?: boolean
          is_popular?: boolean
          itinerary?: string[]
          matches?: string[]
          name?: string
          region?: string
          restaurants?: string[]
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
          weather?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          deal_id: string
          destination_name: string
          id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          destination_name: string
          id?: string
          snapshot: Json
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          destination_name?: string
          id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          deals: boolean
          email: boolean
          push: boolean
          sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          deals?: boolean
          email?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          deals?: boolean
          email?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          allowed?: boolean
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          allowed?: boolean
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_trips: {
        Row: {
          answers: Json
          created_at: string
          destination_name: string
          id: string
          snapshot: Json
          title: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          destination_name: string
          id?: string
          snapshot: Json
          title: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          destination_name?: string
          id?: string
          snapshot?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          answers: Json
          created_at: string
          destination_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          destination_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          destination_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role:
        | "super_admin"
        | "admin"
        | "support"
        | "marketing"
        | "content_manager"
        | "finance"
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
      app_role: [
        "super_admin",
        "admin",
        "support",
        "marketing",
        "content_manager",
        "finance",
      ],
    },
  },
} as const
