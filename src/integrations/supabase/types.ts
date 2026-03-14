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
      admin_whitelist: {
        Row: {
          created_at: string | null
          email: string
        }
        Insert: {
          created_at?: string | null
          email: string
        }
        Update: {
          created_at?: string | null
          email?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          id: string
          is_active: boolean
          model: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          provider?: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      board_cards: {
        Row: {
          board_id: string
          column_id: string
          cover_color: string | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_complete: boolean | null
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          board_id: string
          column_id: string
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean | null
          position?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          board_id?: string
          column_id?: string
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_complete?: boolean | null
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      board_columns: {
        Row: {
          board_id: string
          created_at: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          board_id: string
          created_at?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          board_id?: string
          created_at?: string | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          board_id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          board_id: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          board_id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          cover_color: string | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          id: string
          is_closed: boolean | null
          is_starred: boolean | null
          theme: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed?: boolean | null
          is_starred?: boolean | null
          theme?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_color?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed?: boolean | null
          is_starred?: boolean | null
          theme?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      card_activities: {
        Row: {
          action: string
          card_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          card_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          card_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_activities_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_attachments: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          mime_type: string | null
          name: string
          url: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          mime_type?: string | null
          name: string
          url: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_checklists: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          position: number | null
          title: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          position?: number | null
          title?: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          position?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_comments: {
        Row: {
          card_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_label_assignments: {
        Row: {
          card_id: string
          label_id: string
        }
        Insert: {
          card_id: string
          label_id: string
        }
        Update: {
          card_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_label_assignments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "card_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      card_labels: {
        Row: {
          board_id: string
          color: string
          id: string
          name: string | null
        }
        Insert: {
          board_id: string
          color: string
          id?: string
          name?: string | null
        }
        Update: {
          board_id?: string
          color?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_members: {
        Row: {
          card_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_reminders: {
        Row: {
          card_id: string
          created_at: string
          id: string
          remind_at: string
          sent: boolean
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          remind_at: string
          sent?: boolean
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          remind_at?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_reminders_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          due_date: string | null
          id: string
          is_checked: boolean | null
          position: number | null
          text: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_checked?: boolean | null
          position?: number | null
          text: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_checked?: boolean | null
          position?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "card_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      diagram_collaborators: {
        Row: {
          created_at: string | null
          diagram_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          diagram_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          diagram_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagram_collaborators_diagram_id_fkey"
            columns: ["diagram_id"]
            isOneToOne: false
            referencedRelation: "diagrams"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrams: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          is_public: boolean | null
          public_token: string | null
          template_id: string | null
          theme: string | null
          thumbnail: string | null
          title: string
          type: Database["public"]["Enums"]["diagram_type"]
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          is_public?: boolean | null
          public_token?: string | null
          template_id?: string | null
          theme?: string | null
          thumbnail?: string | null
          title?: string
          type?: Database["public"]["Enums"]["diagram_type"]
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          is_public?: boolean | null
          public_token?: string | null
          template_id?: string | null
          theme?: string | null
          thumbnail?: string | null
          title?: string
          type?: Database["public"]["Enums"]["diagram_type"]
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean | null
          card_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          diagram_id: string | null
          end_at: string
          id: string
          start_at: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          card_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          diagram_id?: string | null
          end_at: string
          id?: string
          start_at: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          card_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          diagram_id?: string | null
          end_at?: string
          id?: string
          start_at?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_diagram_id_fkey"
            columns: ["diagram_id"]
            isOneToOne: false
            referencedRelation: "diagrams"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          position: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          resource_id: string
          resource_type: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          resource_id: string
          resource_type: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          resource_id?: string
          resource_type?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          board_id: string | null
          body: string | null
          card_id: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          board_id?: string | null
          body?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          board_id?: string | null
          body?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "board_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price_brl: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          name: string
          price_brl?: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price_brl?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          notify_agenda_event_updated: boolean
          notify_agenda_reminders: boolean
          notify_board_card_assigned: boolean
          notify_board_checklist_done: boolean
          notify_board_label_changed: boolean
          notify_card_moved: boolean
          notify_comments: boolean
          notify_diagram_commented: boolean
          notify_diagram_shared: boolean
          notify_due_soon: boolean
          notify_member_added: boolean
          onboarding_done: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          notify_agenda_event_updated?: boolean
          notify_agenda_reminders?: boolean
          notify_board_card_assigned?: boolean
          notify_board_checklist_done?: boolean
          notify_board_label_changed?: boolean
          notify_card_moved?: boolean
          notify_comments?: boolean
          notify_diagram_commented?: boolean
          notify_diagram_shared?: boolean
          notify_due_soon?: boolean
          notify_member_added?: boolean
          onboarding_done?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          notify_agenda_event_updated?: boolean
          notify_agenda_reminders?: boolean
          notify_board_card_assigned?: boolean
          notify_board_checklist_done?: boolean
          notify_board_label_changed?: boolean
          notify_card_moved?: boolean
          notify_comments?: boolean
          notify_diagram_commented?: boolean
          notify_diagram_shared?: boolean
          notify_due_soon?: boolean
          notify_member_added?: boolean
          onboarding_done?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      can_access_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_card: {
        Args: { _card_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_checklist: {
        Args: { _checklist_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_board_member: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_board_owner: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_diagram_collaborator: {
        Args: { _diagram_id: string; _user_id: string }
        Returns: boolean
      }
      is_diagram_editor: {
        Args: { _diagram_id: string; _user_id: string }
        Returns: boolean
      }
      is_diagram_owner: {
        Args: { _diagram_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      diagram_type:
        | "mindmap"
        | "flowchart"
        | "orgchart"
        | "timeline"
        | "concept_map"
        | "swimlane"
        | "wireframe"
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
      app_role: ["admin", "moderator", "user"],
      diagram_type: [
        "mindmap",
        "flowchart",
        "orgchart",
        "timeline",
        "concept_map",
        "swimlane",
        "wireframe",
      ],
    },
  },
} as const
