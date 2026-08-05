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
      ai_rate_limits: {
        Row: {
          hits: number
          identity: string
          window_start: string
        }
        Insert: {
          hits?: number
          identity: string
          window_start?: string
        }
        Update: {
          hits?: number
          identity?: string
          window_start?: string
        }
        Relationships: []
      }
      app_error_log: {
        Row: {
          context: Json
          created_at: string
          id: string
          message: string
          route: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          message: string
          route?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          deal_id: string
          destination_name: string
          end_date: string
          id: string
          idempotency_key: string | null
          nights: number
          payment_status: string
          people: number
          price_per_person: number
          refund_status: string | null
          snapshot: Json
          start_date: string
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          deal_id: string
          destination_name: string
          end_date: string
          id?: string
          idempotency_key?: string | null
          nights: number
          payment_status?: string
          people: number
          price_per_person: number
          refund_status?: string | null
          snapshot: Json
          start_date: string
          status?: string
          total_price: number
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          deal_id?: string
          destination_name?: string
          end_date?: string
          id?: string
          idempotency_key?: string | null
          nights?: number
          payment_status?: string
          people?: number
          price_per_person?: number
          refund_status?: string | null
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
          airport_codes: string[]
          attractions: string[]
          average_trip_duration: number | null
          avg_budget_per_person: number
          best_travel_months: number[]
          city_en: string | null
          country: string
          country_code: string
          country_en: string | null
          created_at: string
          currency: string | null
          demo_supported: boolean
          direct_flight_from_tlv: boolean
          flag: string
          flight_hours: number
          has_offers: boolean
          hotels: Json
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_popular: boolean
          is_trending: boolean
          itinerary: string[]
          languages: string[]
          latitude: number | null
          longitude: number | null
          matches: string[]
          name: string
          provider_supported: boolean
          region: string
          restaurants: string[]
          short_description: string | null
          slug: string
          sort_order: number
          subregion: string | null
          tagline: string
          timezone: string | null
          travel_categories: string[]
          updated_at: string
          weather: string
        }
        Insert: {
          airport_codes?: string[]
          attractions?: string[]
          average_trip_duration?: number | null
          avg_budget_per_person: number
          best_travel_months?: number[]
          city_en?: string | null
          country: string
          country_code: string
          country_en?: string | null
          created_at?: string
          currency?: string | null
          demo_supported?: boolean
          direct_flight_from_tlv?: boolean
          flag: string
          flight_hours: number
          has_offers?: boolean
          hotels?: Json
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean
          is_trending?: boolean
          itinerary?: string[]
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          matches?: string[]
          name: string
          provider_supported?: boolean
          region: string
          restaurants?: string[]
          short_description?: string | null
          slug: string
          sort_order?: number
          subregion?: string | null
          tagline: string
          timezone?: string | null
          travel_categories?: string[]
          updated_at?: string
          weather?: string
        }
        Update: {
          airport_codes?: string[]
          attractions?: string[]
          average_trip_duration?: number | null
          avg_budget_per_person?: number
          best_travel_months?: number[]
          city_en?: string | null
          country?: string
          country_code?: string
          country_en?: string | null
          created_at?: string
          currency?: string | null
          demo_supported?: boolean
          direct_flight_from_tlv?: boolean
          flag?: string
          flight_hours?: number
          has_offers?: boolean
          hotels?: Json
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean
          is_trending?: boolean
          itinerary?: string[]
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          matches?: string[]
          name?: string
          provider_supported?: boolean
          region?: string
          restaurants?: string[]
          short_description?: string | null
          slug?: string
          sort_order?: number
          subregion?: string | null
          tagline?: string
          timezone?: string | null
          travel_categories?: string[]
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
      notification_log: {
        Row: {
          channel: string
          context: Json
          created_at: string
          error_message: string | null
          id: string
          provider_id: string
          recipient: string
          status: string
          template: string
          user_id: string | null
        }
        Insert: {
          channel: string
          context?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          provider_id: string
          recipient: string
          status: string
          template: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          context?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          provider_id?: string
          recipient?: string
          status?: string
          template?: string
          user_id?: string | null
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
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          idempotency_key: string
          operation: string
          payload: Json
          provider_id: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          operation: string
          payload?: Json
          provider_id: string
          provider_reference?: string | null
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          operation?: string
          payload?: Json
          provider_id?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          active: boolean
          baseline_price: number
          created_at: string
          deal_id: string
          destination_name: string
          id: string
          target_price: number
          user_id: string
        }
        Insert: {
          active?: boolean
          baseline_price: number
          created_at?: string
          deal_id: string
          destination_name: string
          id?: string
          target_price: number
          user_id: string
        }
        Update: {
          active?: boolean
          baseline_price?: number
          created_at?: string
          deal_id?: string
          destination_name?: string
          id?: string
          target_price?: number
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
      provider_events: {
        Row: {
          context: Json
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number
          ok: boolean
          operation: string
          provider_id: string
          provider_kind: string
        }
        Insert: {
          context?: Json
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number
          ok: boolean
          operation: string
          provider_id: string
          provider_kind: string
        }
        Update: {
          context?: Json
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number
          ok?: boolean
          operation?: string
          provider_id?: string
          provider_kind?: string
        }
        Relationships: []
      }
      provider_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          external_id: string
          id: string
          payload: Json
          processed: boolean
          provider_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          external_id: string
          id?: string
          payload?: Json
          processed?: boolean
          provider_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          external_id?: string
          id?: string
          payload?: Json
          processed?: boolean
          provider_id?: string
          verified?: boolean
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
      support_requests: {
        Row: {
          booking_id: string | null
          created_at: string
          email: string
          id: string
          message: string
          status: string
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          topic: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      ai_rate_limit_hit: {
        Args: { _identity: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      claim_super_admin: { Args: { _user_id: string }; Returns: boolean }
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
