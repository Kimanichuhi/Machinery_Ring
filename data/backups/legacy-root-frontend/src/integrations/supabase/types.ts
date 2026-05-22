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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      commission_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          sales_count: number
          status: string
          tot_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          sales_count?: number
          status?: string
          tot_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          sales_count?: number
          status?: string
          tot_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      farmer_private_data: {
        Row: {
          created_at: string
          date_of_birth: string | null
          farmer_id: string
          id_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          farmer_id: string
          id_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          farmer_id?: string
          id_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_private_data_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: true
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      farmers: {
        Row: {
          county: string
          created_at: string
          crops: string[] | null
          email: string | null
          farm_size: number | null
          farming_type: string | null
          gender: string | null
          id: string
          last_activity_date: string | null
          livestock: string[] | null
          local_mr_id: string | null
          name: string
          phone: string | null
          registered_by: string | null
          status: string
          sub_county: string | null
          trainings_attended: number
          updated_at: string
          village: string | null
          visits_count: number
          ward: string | null
        }
        Insert: {
          county: string
          created_at?: string
          crops?: string[] | null
          email?: string | null
          farm_size?: number | null
          farming_type?: string | null
          gender?: string | null
          id?: string
          last_activity_date?: string | null
          livestock?: string[] | null
          local_mr_id?: string | null
          name: string
          phone?: string | null
          registered_by?: string | null
          status?: string
          sub_county?: string | null
          trainings_attended?: number
          updated_at?: string
          village?: string | null
          visits_count?: number
          ward?: string | null
        }
        Update: {
          county?: string
          created_at?: string
          crops?: string[] | null
          email?: string | null
          farm_size?: number | null
          farming_type?: string | null
          gender?: string | null
          id?: string
          last_activity_date?: string | null
          livestock?: string[] | null
          local_mr_id?: string | null
          name?: string
          phone?: string | null
          registered_by?: string | null
          status?: string
          sub_county?: string | null
          trainings_attended?: number
          updated_at?: string
          village?: string | null
          visits_count?: number
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmers_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
        ]
      }
      local_mrs: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          coordinator_id: string | null
          county: string
          created_at: string
          id: string
          name: string
          region: string
          status: string
          sub_county: string | null
          updated_at: string
          ward: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          coordinator_id?: string | null
          county: string
          created_at?: string
          id?: string
          name: string
          region: string
          status?: string
          sub_county?: string | null
          updated_at?: string
          ward?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          coordinator_id?: string | null
          county?: string
          created_at?: string
          id?: string
          name?: string
          region?: string
          status?: string
          sub_county?: string | null
          updated_at?: string
          ward?: string | null
        }
        Relationships: []
      }
      machinery: {
        Row: {
          category: string
          condition: string | null
          created_at: string
          daily_rate: number
          hourly_rate: number
          id: string
          last_service_date: string | null
          local_mr_id: string | null
          model: string | null
          name: string
          next_service_date: string | null
          registration_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          condition?: string | null
          created_at?: string
          daily_rate?: number
          hourly_rate?: number
          id?: string
          last_service_date?: string | null
          local_mr_id?: string | null
          model?: string | null
          name: string
          next_service_date?: string | null
          registration_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string
          daily_rate?: number
          hourly_rate?: number
          id?: string
          last_service_date?: string | null
          local_mr_id?: string | null
          model?: string | null
          name?: string
          next_service_date?: string | null
          registration_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_bookings: {
        Row: {
          booked_by: string
          created_at: string
          end_date: string
          end_time: string | null
          farmer_id: string | null
          id: string
          local_mr_id: string | null
          machinery_id: string
          mechanisation_job_id: string | null
          notes: string | null
          purpose: string | null
          start_date: string
          start_time: string | null
          status: string
          tot_id: string | null
          updated_at: string
        }
        Insert: {
          booked_by: string
          created_at?: string
          end_date: string
          end_time?: string | null
          farmer_id?: string | null
          id?: string
          local_mr_id?: string | null
          machinery_id: string
          mechanisation_job_id?: string | null
          notes?: string | null
          purpose?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          tot_id?: string | null
          updated_at?: string
        }
        Update: {
          booked_by?: string
          created_at?: string
          end_date?: string
          end_time?: string | null
          farmer_id?: string | null
          id?: string
          local_mr_id?: string | null
          machinery_id?: string
          mechanisation_job_id?: string | null
          notes?: string | null
          purpose?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          tot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_bookings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_bookings_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_bookings_machinery_id_fkey"
            columns: ["machinery_id"]
            isOneToOne: false
            referencedRelation: "machinery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_bookings_mechanisation_job_id_fkey"
            columns: ["mechanisation_job_id"]
            isOneToOne: false
            referencedRelation: "mechanisation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machinery_bookings_tot_id_fkey"
            columns: ["tot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machinery_service_history: {
        Row: {
          cost: number | null
          created_at: string
          description: string
          id: string
          machinery_id: string
          next_service_date: string | null
          notes: string | null
          odometer_reading: number | null
          parts_replaced: string[] | null
          performed_by: string | null
          service_date: string
          service_type: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          machinery_id: string
          next_service_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          parts_replaced?: string[] | null
          performed_by?: string | null
          service_date: string
          service_type: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          machinery_id?: string
          next_service_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          parts_replaced?: string[] | null
          performed_by?: string | null
          service_date?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machinery_service_history_machinery_id_fkey"
            columns: ["machinery_id"]
            isOneToOne: false
            referencedRelation: "machinery"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanisation_jobs: {
        Row: {
          area_acres: number | null
          commission_per_acre: number | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          duration_hours: number | null
          farmer_id: string
          id: string
          local_mr_id: string
          machinery_id: string
          scheduled_date: string
          scheduled_time: string | null
          service_type: string
          status: string
          tot_commission: number | null
          tot_id: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          area_acres?: number | null
          commission_per_acre?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          duration_hours?: number | null
          farmer_id: string
          id?: string
          local_mr_id: string
          machinery_id: string
          scheduled_date: string
          scheduled_time?: string | null
          service_type: string
          status?: string
          tot_commission?: number | null
          tot_id: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          area_acres?: number | null
          commission_per_acre?: number | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          duration_hours?: number | null
          farmer_id?: string
          id?: string
          local_mr_id?: string
          machinery_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          service_type?: string
          status?: string
          tot_commission?: number | null
          tot_id?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanisation_jobs_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanisation_jobs_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mechanisation_jobs_machinery_id_fkey"
            columns: ["machinery_id"]
            isOneToOne: false
            referencedRelation: "machinery"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          daily_digest: boolean
          email_notifications: boolean
          id: string
          push_notifications: boolean
          sms_notifications: boolean
          updated_at: string
          user_id: string
          weekly_reports: boolean
        }
        Insert: {
          created_at?: string
          daily_digest?: boolean
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id: string
          weekly_reports?: boolean
        }
        Update: {
          created_at?: string
          daily_digest?: boolean
          email_notifications?: boolean
          id?: string
          push_notifications?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id?: string
          weekly_reports?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          local_mr_id: string | null
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          local_mr_id?: string | null
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          local_mr_id?: string | null
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buying_price: number
          category: string
          commission_per_unit: number
          created_at: string
          description: string | null
          id: string
          min_stock_level: number
          name: string
          selling_price: number
          status: string
          stock_quantity: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          buying_price?: number
          category: string
          commission_per_unit?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock_level?: number
          name: string
          selling_price?: number
          status?: string
          stock_quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          buying_price?: number
          category?: string
          commission_per_unit?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock_level?: number
          name?: string
          selling_price?: number
          status?: string
          stock_quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          commission_amount: number
          commission_paid: boolean
          commission_paid_at: string | null
          commission_per_unit: number
          created_at: string
          delivery_note_number: string | null
          farmer_id: string | null
          id: string
          local_mr_commission: number
          local_mr_id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          product_id: string
          profit_amount: number
          quantity: number
          regional_mr_commission: number
          sale_date: string
          tot_commission: number
          tot_id: string
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_per_unit: number
          created_at?: string
          delivery_note_number?: string | null
          farmer_id?: string | null
          id?: string
          local_mr_commission?: number
          local_mr_id: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id: string
          profit_amount?: number
          quantity: number
          regional_mr_commission?: number
          sale_date?: string
          tot_commission?: number
          tot_id: string
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_per_unit?: number
          created_at?: string
          delivery_note_number?: string | null
          farmer_id?: string | null
          id?: string
          local_mr_commission?: number
          local_mr_id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string
          profit_amount?: number
          quantity?: number
          regional_mr_commission?: number
          sale_date?: string
          tot_commission?: number
          tot_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tot_assignments: {
        Row: {
          assigned_at: string
          id: string
          local_mr_id: string
          status: string
          tot_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          local_mr_id: string
          status?: string
          tot_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          local_mr_id?: string
          status?: string
          tot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tot_assignments_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendees: {
        Row: {
          attended: boolean
          created_at: string
          farmer_id: string | null
          id: string
          profile_id: string | null
          training_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          farmer_id?: string | null
          id?: string
          profile_id?: string | null
          training_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          farmer_id?: string | null
          id?: string
          profile_id?: string | null
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendees_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          local_mr_id: string | null
          max_attendees: number | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          title: string
          trainer: string | null
          trainer_id: string
          training_type: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          local_mr_id?: string | null
          max_attendees?: number | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          title: string
          trainer?: string | null
          trainer_id: string
          training_type: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          local_mr_id?: string | null
          max_attendees?: number | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          title?: string
          trainer?: string | null
          trainer_id?: string
          training_type?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      visits: {
        Row: {
          created_at: string
          farmer_id: string | null
          follow_up_completed: boolean
          follow_up_date: string | null
          follow_up_required: boolean
          id: string
          local_mr_id: string | null
          notes: string | null
          parent_visit_id: string | null
          profile_id: string | null
          purpose: string
          tot_id: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          farmer_id?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          local_mr_id?: string | null
          notes?: string | null
          parent_visit_id?: string | null
          profile_id?: string | null
          purpose: string
          tot_id: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          created_at?: string
          farmer_id?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          local_mr_id?: string | null
          notes?: string | null
          parent_visit_id?: string | null
          profile_id?: string | null
          purpose?: string
          tot_id?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_local_mr_id_fkey"
            columns: ["local_mr_id"]
            isOneToOne: false
            referencedRelation: "local_mrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_parent_visit_id_fkey"
            columns: ["parent_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_notify_overdue_followups: { Args: never; Returns: undefined }
      get_local_mr_performance: {
        Args: { _local_mr_id?: string }
        Returns: {
          county: string
          local_mr_id: string
          local_mr_name: string
          region: string
          total_bookings: number
          total_commission: number
          total_farmers: number
          total_revenue: number
          total_sales: number
          total_tots: number
          total_trainings: number
          total_visits: number
        }[]
      }
      get_monthly_trends: {
        Args: never
        Returns: {
          commission: number
          farmers: number
          month: string
          revenue: number
          sales_count: number
          tots: number
        }[]
      }
      get_products_for_role: {
        Args: never
        Returns: {
          category: string
          commission_per_unit: number
          created_at: string
          description: string
          id: string
          min_stock_level: number
          name: string
          status: string
          stock_quantity: number
          unit: string
          unit_price: number
          updated_at: string
        }[]
      }
      get_sales_summary: {
        Args: { _local_mr_id?: string }
        Returns: {
          active_tots: number
          local_mr_id: string
          local_mr_name: string
          month: string
          total_commission: number
          total_revenue: number
          total_sales: number
          unique_farmers: number
        }[]
      }
      get_tot_performance: {
        Args: { _local_mr_id?: string }
        Returns: {
          farmers_served: number
          local_mr_id: string
          local_mr_name: string
          paid_commission: number
          pending_commission: number
          tot_id: string
          tot_name: string
          total_commission: number
          total_revenue: number
          total_sales: number
          total_visits: number
        }[]
      }
      get_user_local_mr_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordinator_of: {
        Args: { _local_mr_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _after_data?: Json
          _before_data?: Json
          _entity: string
          _entity_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "local_mr_coordinator"
        | "tot"
        | "office_employee"
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
        "admin",
        "manager",
        "local_mr_coordinator",
        "tot",
        "office_employee",
      ],
    },
  },
} as const
