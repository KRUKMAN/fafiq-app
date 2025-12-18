export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: {
          id: string;
          org_id: string;
          created_at: string;
          actor_user_id: string | null;
          actor_membership_id: string | null;
          entity_type: string;
          entity_id: string;
          event_type: string;
          summary: string;
          payload: Json;
          related: Json;
        };
        Insert: {
          id?: string;
          org_id: string;
          created_at?: string;
          actor_user_id?: string | null;
          actor_membership_id?: string | null;
          entity_type: string;
          entity_id: string;
          event_type: string;
          summary: string;
          payload?: Json;
          related?: Json;
        };
        Update: {
          id?: string;
          org_id?: string;
          created_at?: string;
          actor_user_id?: string | null;
          actor_membership_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          event_type?: string;
          summary?: string;
          payload?: Json;
          related?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_events_actor_membership_id_fkey';
            columns: ['actor_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_events_actor_user_id_fkey';
            columns: ['actor_user_id'];
            referencedRelation: 'auth.users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_events_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          entity_type: string;
          entity_id: string;
          storage_bucket: string;
          storage_path: string;
          filename: string | null;
          mime_type: string | null;
          description: string | null;
          created_at: string;
          created_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          entity_type: string;
          entity_id: string;
          storage_bucket?: string;
          storage_path: string;
          filename?: string | null;
          mime_type?: string | null;
          description?: string | null;
          created_at?: string;
          created_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          entity_type?: string;
          entity_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          filename?: string | null;
          mime_type?: string | null;
          description?: string | null;
          created_at?: string;
          created_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          }
        ];
      };
      dog_photos: {
        Row: {
          id: string;
          org_id: string;
          dog_id: string;
          storage_bucket: string;
          storage_path: string;
          caption: string | null;
          is_primary: boolean;
          created_at: string;
          created_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          dog_id: string;
          storage_bucket?: string;
          storage_path: string;
          caption?: string | null;
          is_primary?: boolean;
          created_at?: string;
          created_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          dog_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          caption?: string | null;
          is_primary?: boolean;
          created_at?: string;
          created_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dog_photos_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dog_photos_dog_id_fkey';
            columns: ['dog_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dog_photos_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          }
        ];
      };
      dogs: {
        Row: {
          id: string;
          org_id: string;
          stage: string;
          name: string;
          location: string | null;
          description: string | null;
          medical_notes: string | null;
          behavioral_notes: string | null;
          responsible_membership_id: string | null;
          foster_membership_id: string | null;
          budget_limit: number | null;
          extra_fields: Json;
          created_at: string;
          updated_at: string;
          created_by_membership_id: string | null;
          updated_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          stage: string;
          name: string;
          location?: string | null;
          description?: string | null;
          medical_notes?: string | null;
          behavioral_notes?: string | null;
          responsible_membership_id?: string | null;
          foster_membership_id?: string | null;
          budget_limit?: number | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          stage?: string;
          name?: string;
          location?: string | null;
          description?: string | null;
          medical_notes?: string | null;
          behavioral_notes?: string | null;
          responsible_membership_id?: string | null;
          foster_membership_id?: string | null;
          budget_limit?: number | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dogs_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dogs_foster_membership_id_fkey';
            columns: ['foster_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dogs_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dogs_responsible_membership_id_fkey';
            columns: ['responsible_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dogs_updated_by_membership_id_fkey';
            columns: ['updated_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          org_id: string;
          dog_id: string | null;
          category: string;
          amount: number;
          incurred_on: string;
          notes: string | null;
          extra_fields: Json;
          created_at: string;
          updated_at: string;
          created_by_membership_id: string | null;
          updated_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          dog_id?: string | null;
          category: string;
          amount: number;
          incurred_on: string;
          notes?: string | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          dog_id?: string | null;
          category?: string;
          amount?: number;
          incurred_on?: string;
          notes?: string | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_dog_id_fkey';
            columns: ['dog_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_updated_by_membership_id_fkey';
            columns: ['updated_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          }
        ];
      };
      medical_records: {
        Row: {
          id: string;
          org_id: string;
          dog_id: string;
          record_type: string;
          occurred_on: string | null;
          description: string | null;
          cost: number | null;
          extra_fields: Json;
          created_at: string;
          updated_at: string;
          created_by_membership_id: string | null;
          updated_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          dog_id: string;
          record_type: string;
          occurred_on?: string | null;
          description?: string | null;
          cost?: number | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          dog_id?: string;
          record_type?: string;
          occurred_on?: string | null;
          description?: string | null;
          cost?: number | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'medical_records_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medical_records_dog_id_fkey';
            columns: ['dog_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medical_records_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medical_records_updated_by_membership_id_fkey';
            columns: ['updated_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          }
        ];
      };
      memberships: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          roles: string[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          roles?: string[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          roles?: string[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'auth.users';
            referencedColumns: ['id'];
          }
        ];
      };
      orgs: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'auth.users';
            referencedColumns: ['id'];
          }
        ];
      };
      transports: {
        Row: {
          id: string;
          org_id: string;
          dog_id: string | null;
          from_location: string | null;
          to_location: string | null;
          status: string;
          assigned_membership_id: string | null;
          window_start: string | null;
          window_end: string | null;
          notes: string | null;
          extra_fields: Json;
          created_at: string;
          updated_at: string;
          created_by_membership_id: string | null;
          updated_by_membership_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          dog_id?: string | null;
          from_location?: string | null;
          to_location?: string | null;
          status: string;
          assigned_membership_id?: string | null;
          window_start?: string | null;
          window_end?: string | null;
          notes?: string | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          dog_id?: string | null;
          from_location?: string | null;
          to_location?: string | null;
          status?: string;
          assigned_membership_id?: string | null;
          window_start?: string | null;
          window_end?: string | null;
          notes?: string | null;
          extra_fields?: Json;
          created_at?: string;
          updated_at?: string;
          created_by_membership_id?: string | null;
          updated_by_membership_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transports_assigned_membership_id_fkey';
            columns: ['assigned_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transports_created_by_membership_id_fkey';
            columns: ['created_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transports_dog_id_fkey';
            columns: ['dog_id'];
            referencedRelation: 'dogs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transports_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transports_updated_by_membership_id_fkey';
            columns: ['updated_by_membership_id'];
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
