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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          actor_id: string | null
          data: Json
          entity_id: string | null
          event_type: string
          id: number
          occurred_at: string
          project_id: string | null
          subject_user_id: string | null
          task_id: string | null
          txid: number
        }
        Insert: {
          actor_id?: string | null
          data?: Json
          entity_id?: string | null
          event_type: string
          id?: never
          occurred_at?: string
          project_id?: string | null
          subject_user_id?: string | null
          task_id?: string | null
          txid?: number
        }
        Update: {
          actor_id?: string | null
          data?: Json
          entity_id?: string | null
          event_type?: string
          id?: never
          occurred_at?: string
          project_id?: string | null
          subject_user_id?: string | null
          task_id?: string | null
          txid?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_revisions: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_comment: string | null
          id: string
          max_minutes: number
          min_minutes: number
          note: string | null
          proposal_id: string
          revision_number: number
          submitted_at: string
          submitted_by: string
          task_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_comment?: string | null
          id?: string
          max_minutes: number
          min_minutes: number
          note?: string | null
          proposal_id: string
          revision_number: number
          submitted_at?: string
          submitted_by: string
          task_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_comment?: string | null
          id?: string
          max_minutes?: number
          min_minutes?: number
          note?: string | null
          proposal_id?: string
          revision_number?: number
          submitted_at?: string
          submitted_by?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_revisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "estimate_revisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_hours_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          minutes: number
          reason: string
          requested_by: string
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          minutes: number
          reason: string
          requested_by: string
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          minutes?: number
          reason?: string
          requested_by?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_hours_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_hours_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_hours_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "extra_hours_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          last_send_error: string | null
          last_sent_at: string
          revoked_at: string | null
          role: string
          send_count: number
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          full_name: string
          id?: string
          invited_by?: string | null
          last_send_error?: string | null
          last_sent_at?: string
          revoked_at?: string | null
          role: string
          send_count?: number
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          last_send_error?: string | null
          last_sent_at?: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_user_id_fkey"
            columns: ["accepted_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      month_closures: {
        Row: {
          closed_at: string
          closed_by: string
          month: string
        }
        Insert: {
          closed_at?: string
          closed_by: string
          month: string
        }
        Update: {
          closed_at?: string
          closed_by?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      month_report_lines: {
        Row: {
          amount: number
          counted_minutes: number
          currency: string | null
          hourly_rate: number | null
          id: string
          month: string
          over_limit_minutes: number
          project_id: string
          project_name: string
          rate_id: string | null
          task_id: string
          task_title: string
          user_id: string
        }
        Insert: {
          amount?: number
          counted_minutes: number
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          month: string
          over_limit_minutes: number
          project_id: string
          project_name: string
          rate_id?: string | null
          task_id: string
          task_title: string
          user_id: string
        }
        Update: {
          amount?: number
          counted_minutes?: number
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          month?: string
          over_limit_minutes?: number
          project_id?: string
          project_name?: string
          rate_id?: string | null
          task_id?: string
          task_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_report_lines_month_fkey"
            columns: ["month"]
            isOneToOne: false
            referencedRelation: "month_closures"
            referencedColumns: ["month"]
          },
          {
            foreignKeyName: "month_report_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_report_lines_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_report_lines_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "month_report_lines_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_report_lines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          email_attempts: number
          email_claimed_at: string | null
          email_last_error: string | null
          email_sent_at: string | null
          email_status: string
          event_id: number
          id: string
          project_id: string | null
          read_at: string | null
          recipient_id: string
          task_id: string | null
          txid: number
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          email_attempts?: number
          email_claimed_at?: string | null
          email_last_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          event_id: number
          id?: string
          project_id?: string | null
          read_at?: string | null
          recipient_id: string
          task_id?: string | null
          txid: number
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          email_attempts?: number
          email_claimed_at?: string | null
          email_last_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          event_id?: number
          id?: string
          project_id?: string | null
          read_at?: string | null
          recipient_id?: string
          task_id?: string | null
          txid?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "audit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          default_currency: string
          id: number
          name: string
          time_zone: string
          tolerance_percent: number
          updated_at: string
        }
        Insert: {
          default_currency?: string
          id?: number
          name?: string
          time_zone?: string
          tolerance_percent?: number
          updated_at?: string
        }
        Update: {
          default_currency?: string
          id?: number
          name?: string
          time_zone?: string
          tolerance_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          deactivated_at: string | null
          email: string
          full_name: string
          id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          deactivated_at?: string | null
          email: string
          full_name: string
          id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          deactivated_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_at: string
          added_by: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          status: string
          status_changed_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          status?: string
          status_changed_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          status?: string
          status_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          completed_at: string | null
          id: string
          project_id: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          project_id: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          project_id?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          effective_from: string
          hourly_rate: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency: string
          effective_from: string
          hourly_rate: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          effective_from?: string
          hourly_rate?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          kind: string
          task_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          task_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string | null
          task_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          task_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          task_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_revision_id: string | null
          assigned_at: string | null
          assignee_id: string | null
          counted_minutes: number
          created_at: string
          created_by: string
          description: string
          estimate_max_minutes: number | null
          estimate_min_minutes: number | null
          estimate_note: string | null
          ever_submitted: boolean
          first_approved_at: string | null
          first_approved_on: string | null
          id: string
          limit_minutes: number | null
          over_limit_minutes: number
          project_id: string
          status: string
          status_changed_at: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_revision_id?: string | null
          assigned_at?: string | null
          assignee_id?: string | null
          counted_minutes?: number
          created_at?: string
          created_by: string
          description?: string
          estimate_max_minutes?: number | null
          estimate_min_minutes?: number | null
          estimate_note?: string | null
          ever_submitted?: boolean
          first_approved_at?: string | null
          first_approved_on?: string | null
          id?: string
          limit_minutes?: number | null
          over_limit_minutes?: number
          project_id: string
          status?: string
          status_changed_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_revision_id?: string | null
          assigned_at?: string | null
          assignee_id?: string | null
          counted_minutes?: number
          created_at?: string
          created_by?: string
          description?: string
          estimate_max_minutes?: number | null
          estimate_min_minutes?: number | null
          estimate_note?: string | null
          ever_submitted?: boolean
          first_approved_at?: string | null
          first_approved_on?: string | null
          id?: string
          limit_minutes?: number | null
          over_limit_minutes?: number
          project_id?: string
          status?: string
          status_changed_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_approved_revision_fk"
            columns: ["approved_revision_id"]
            isOneToOne: false
            referencedRelation: "estimate_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          auto_stopped_reason: string | null
          counted_minutes: number
          created_at: string
          description: string
          duration_minutes: number
          ended_at: string | null
          id: string
          month: string | null
          over_limit_minutes: number
          source: string
          started_at: string | null
          task_id: string
          timer_id: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          auto_stopped_reason?: string | null
          counted_minutes?: number
          created_at?: string
          description: string
          duration_minutes: number
          ended_at?: string | null
          id?: string
          month?: string | null
          over_limit_minutes?: number
          source: string
          started_at?: string | null
          task_id: string
          timer_id?: string | null
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          auto_stopped_reason?: string | null
          counted_minutes?: number
          created_at?: string
          description?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          month?: string | null
          over_limit_minutes?: number
          source?: string
          started_at?: string | null
          task_id?: string
          timer_id?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_timer_id_fkey"
            columns: ["timer_id"]
            isOneToOne: false
            referencedRelation: "timers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timer_screenshots: {
        Row: {
          captured_at: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          storage_path: string
          task_id: string
          timer_id: string
          user_id: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          storage_path: string
          task_id: string
          timer_id: string
          user_id: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          storage_path?: string
          task_id?: string
          timer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timer_screenshots_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timer_screenshots_timer_id_fkey"
            columns: ["timer_id"]
            isOneToOne: false
            referencedRelation: "timers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timer_screenshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timer_segments: {
        Row: {
          ended_at: string | null
          id: string
          started_at: string
          timer_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          started_at: string
          timer_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          started_at?: string
          timer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timer_segments_timer_id_fkey"
            columns: ["timer_id"]
            isOneToOne: false
            referencedRelation: "timers"
            referencedColumns: ["id"]
          },
        ]
      }
      timers: {
        Row: {
          auto_reason: string | null
          id: string
          outcome: string | null
          paused_at: string | null
          share_seen_at: string | null
          started_at: string
          stopped_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          auto_reason?: string | null
          id?: string
          outcome?: string | null
          paused_at?: string | null
          share_seen_at?: string | null
          started_at?: string
          stopped_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          auto_reason?: string | null
          id?: string
          outcome?: string | null
          paused_at?: string | null
          share_seen_at?: string | null
          started_at?: string
          stopped_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_progress"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "timers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approval_queue: {
        Row: {
          item_count: number | null
          item_id: string | null
          kind: string | null
          max_minutes: number | null
          min_minutes: number | null
          project_id: string | null
          requested_by: string | null
          task_id: string | null
          waiting_since: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          data: Json | null
          entity_id: string | null
          event_type: string | null
          id: number | null
          occurred_at: string | null
          project_id: string | null
          subject_user_id: string | null
          task_id: string | null
          txid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_lines: {
        Row: {
          amount: number | null
          counted_minutes: number | null
          currency: string | null
          hourly_rate: number | null
          is_final: boolean | null
          month: string | null
          over_limit_minutes: number | null
          project_id: string | null
          project_name: string | null
          rate_id: string | null
          task_id: string | null
          task_title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      task_progress: {
        Row: {
          assignee_id: string | null
          ceiling_minutes: number | null
          counted_minutes: number | null
          limit_minutes: number | null
          over_limit_minutes: number | null
          percent_used: number | null
          project_id: string | null
          remaining_minutes: number | null
          status: string | null
          task_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_task: { Args: { p_task_id: string }; Returns: undefined }
      add_comment: {
        Args: { p_body: string; p_task_id: string }
        Returns: string
      }
      add_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      add_rate: {
        Args: {
          p_currency: string
          p_effective_from: string
          p_hourly_rate: number
          p_user_id: string
        }
        Returns: string
      }
      add_task_link: {
        Args: { p_label?: string; p_task_id: string; p_url: string }
        Returns: string
      }
      add_time_entry: {
        Args: {
          p_description: string
          p_minutes: number
          p_task_id: string
          p_work_date: string
        }
        Returns: string
      }
      approve_all_remaining: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      assign_task: {
        Args: { p_assignee_id: string; p_task_id: string }
        Returns: undefined
      }
      cancel_task: {
        Args: { p_comment?: string; p_task_id: string }
        Returns: undefined
      }
      claim_email_batch: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          data: Json
          email_attempts: number
          email_claimed_at: string | null
          email_last_error: string | null
          email_sent_at: string | null
          email_status: string
          event_id: number
          id: string
          project_id: string | null
          read_at: string | null
          recipient_id: string
          task_id: string | null
          txid: number
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_month: { Args: { p_month: string }; Returns: undefined }
      complete_email_batch: {
        Args: { p_error?: string; p_ids: string[]; p_sent: boolean }
        Returns: undefined
      }
      create_invitation: {
        Args: {
          p_email: string
          p_full_name: string
          p_role: string
          p_token_hash: string
        }
        Returns: string
      }
      create_project: {
        Args: { p_description?: string; p_name: string }
        Returns: string
      }
      create_task: {
        Args: {
          p_assignee_id?: string
          p_description?: string
          p_project_id: string
          p_title: string
        }
        Returns: string
      }
      deactivate_person: { Args: { p_user_id: string }; Returns: undefined }
      decide_estimates: { Args: { p_decisions: Json }; Returns: undefined }
      decide_extra_hours: {
        Args: { p_approve: boolean; p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      delete_comment: { Args: { p_comment_id: string }; Returns: undefined }
      delete_rate: { Args: { p_rate_id: string }; Returns: undefined }
      delete_task: { Args: { p_task_id: string }; Returns: undefined }
      delete_time_entry: { Args: { p_entry_id: string }; Returns: undefined }
      discard_timer: { Args: never; Returns: undefined }
      edit_comment: {
        Args: { p_body: string; p_comment_id: string }
        Returns: undefined
      }
      hold_task: { Args: { p_task_id: string }; Returns: undefined }
      mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      mark_task_done: {
        Args: { p_comment?: string; p_task_id: string }
        Returns: undefined
      }
      reactivate_person: { Args: { p_user_id: string }; Returns: undefined }
      record_invitation_send_error: {
        Args: { p_error: string; p_invitation_id: string }
        Returns: undefined
      }
      remove_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_task_link: { Args: { p_link_id: string }; Returns: undefined }
      renew_invitation: {
        Args: { p_invitation_id: string; p_token_hash: string }
        Returns: undefined
      }
      reopen_month: {
        Args: { p_month: string; p_reason: string }
        Returns: undefined
      }
      request_extra_hours: {
        Args: { p_minutes: number; p_reason: string; p_task_id: string }
        Returns: string
      }
      resume_task: { Args: { p_task_id: string }; Returns: undefined }
      return_task: {
        Args: { p_comment: string; p_task_id: string }
        Returns: undefined
      }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      set_my_avatar: { Args: { p_path: string | null }; Returns: undefined }
      set_person_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      set_project_status: {
        Args: { p_project_id: string; p_status: string }
        Returns: undefined
      }
      set_task_estimate: {
        Args: {
          p_max_minutes: number
          p_min_minutes: number
          p_note?: string
          p_task_id: string
        }
        Returns: undefined
      }
      create_timer_screenshot: { Args: { p_timer_id: string }; Returns: string }
      delete_timer_screenshot: { Args: { p_id: string }; Returns: undefined }
      discard_unstored_screenshot: { Args: { p_id: string }; Returns: undefined }
      pause_timer: { Args: never; Returns: string }
      resume_timer: { Args: never; Returns: undefined }
      start_timer: { Args: { p_task_id: string }; Returns: string }
      touch_timer_share: { Args: never; Returns: undefined }
      stop_timer: {
        Args: {
          p_description: string
          p_ended_at: string
          p_started_at: string
        }
        Returns: number
      }
      submit_proposal: {
        Args: { p_project_id: string; p_task_ids: string[] }
        Returns: string
      }
      update_my_profile: { Args: { p_full_name: string }; Returns: undefined }
      update_project: {
        Args: { p_description: string; p_name: string; p_project_id: string }
        Returns: undefined
      }
      update_settings: {
        Args: {
          p_default_currency: string
          p_name: string
          p_time_zone: string
          p_tolerance_percent: number
        }
        Returns: undefined
      }
      update_task: {
        Args: { p_description: string; p_task_id: string; p_title: string }
        Returns: undefined
      }
      update_time_entry: {
        Args: {
          p_description: string
          p_ended_at?: string
          p_entry_id: string
          p_minutes?: number
          p_started_at?: string
          p_work_date?: string
        }
        Returns: undefined
      }
      withdraw_estimates: {
        Args: { p_revision_ids: string[] }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
