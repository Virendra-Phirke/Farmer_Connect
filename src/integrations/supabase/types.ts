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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      buyer_connections: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          message: string | null
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          message?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_connections_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_connections_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_listings: {
        Row: {
          created_at: string
          crop_name: string
          description: string | null
          expected_harvest_date: string | null
          farmer_id: string
          id: string
          image_url: string | null
          location: string | null
          price_per_kg: number
          quantity_kg: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          description?: string | null
          expected_harvest_date?: string | null
          farmer_id: string
          id?: string
          image_url?: string | null
          location?: string | null
          price_per_kg: number
          quantity_kg: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          description?: string | null
          expected_harvest_date?: string | null
          farmer_id?: string
          id?: string
          image_url?: string | null
          location?: string | null
          price_per_kg?: number
          quantity_kg?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_recommendations: {
        Row: {
          created_at: string
          crop_name: string
          expected_yield: string | null
          fertilizer_info: string | null
          id: string
          location: string | null
          notes: string | null
          season: string
          seed_variety: string | null
          soil_type: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          expected_yield?: string | null
          fertilizer_info?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          season: string
          seed_variety?: string | null
          soil_type: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          expected_yield?: string | null
          fertilizer_info?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          season?: string
          seed_variety?: string | null
          soil_type?: string
        }
        Relationships: []
      }
      equipment_bookings: {
        Row: {
          created_at: string
          end_date: string
          equipment_id: string
          id: string
          notes: string | null
          renter_id: string
          start_date: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          equipment_id: string
          id?: string
          notes?: string | null
          renter_id: string
          start_date: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          renter_id?: string
          start_date?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_bookings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_listings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          location: string
          name: string
          owner_id: string
          price_per_day: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          location: string
          name: string
          owner_id: string
          price_per_day: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          location?: string
          name?: string
          owner_id?: string
          price_per_day?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          profile_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          profile_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "farmer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "farmer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_group_requests: {
        Row: {
          id: string
          group_id: string
          profile_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          profile_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          profile_id?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_group_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "farmer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_group_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_groups: {
        Row: {
          created_at: string
          created_by: string | null
          crop_type: string | null
          description: string | null
          id: string
          name: string
          region: string
          soil_type: string | null
          state: string | null
          district: string | null
          taluka: string | null
          village: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crop_type?: string | null
          description?: string | null
          id?: string
          name: string
          region: string
          soil_type?: string | null
          state?: string | null
          district?: string | null
          taluka?: string | null
          village?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crop_type?: string | null
          description?: string | null
          id?: string
          name?: string
          region?: string
          soil_type?: string | null
          state?: string | null
          district?: string | null
          taluka?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_equipment: string | null
          avatar_url: string | null
          clerk_user_id: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          land_size_acres: number | null
          location: string | null
          phone: string | null
          soil_type: string | null
          updated_at: string
        }
        Insert: {
          available_equipment?: string | null
          avatar_url?: string | null
          clerk_user_id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          land_size_acres?: number | null
          location?: string | null
          phone?: string | null
          soil_type?: string | null
          updated_at?: string
        }
        Update: {
          available_equipment?: string | null
          avatar_url?: string | null
          clerk_user_id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          land_size_acres?: number | null
          location?: string | null
          phone?: string | null
          soil_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          buyer_id: string
          created_at: string
          crop_listing_id: string
          id: string
          message: string | null
          offered_price: number
          quantity_kg: number
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          crop_listing_id: string
          id?: string
          message?: string | null
          offered_price: number
          quantity_kg: number
          request_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          crop_listing_id?: string
          id?: string
          message?: string | null
          offered_price?: number
          quantity_kg?: number
          request_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_crop_listing_id_fkey"
            columns: ["crop_listing_id"]
            isOneToOne: false
            referencedRelation: "crop_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_contracts: {
        Row: {
          buyer_id: string
          created_at: string
          crop_name: string
          delivery_frequency: string
          end_date: string
          farmer_id: string
          id: string
          price_per_kg: number
          quantity_kg_per_delivery: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          crop_name: string
          delivery_frequency?: string
          end_date: string
          farmer_id: string
          id?: string
          price_per_kg: number
          quantity_kg_per_delivery: number
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          crop_name?: string
          delivery_frequency?: string
          end_date?: string
          farmer_id?: string
          id?: string
          price_per_kg?: number
          quantity_kg_per_delivery?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_contracts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_contracts_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          clerk_user_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      weather_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          region: string
          severity: string
          valid_until: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          region: string
          severity?: string
          valid_until?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          region?: string
          severity?: string
          valid_until?: string | null
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
      app_role: "farmer" | "buyer" | "equipment_owner" | "hotel_restaurant_manager"
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
      app_role: ["farmer", "buyer", "equipment_owner", "hotel_restaurant_manager"],
    },
  },
} as const
