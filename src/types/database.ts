export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: any }
  | any[];

export interface Database {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: number;
          incident_id: string;
          incident_title: string | null;
          start_time: string;
          end_time: string | null;
          affected_services: string[];
          event_count: number | null;
          correlation_score: number | null;
          correlation_reasons: string[] | null;
          status: "active" | "investigating" | "resolved" | "mitigated";
          severity: "critical" | "high" | "medium" | "low" | "info";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          incident_id: string;
          incident_title?: string | null;
          start_time?: string;
          end_time?: string | null;
          affected_services?: string[];
          event_count?: number | null;
          correlation_score?: number | null;
          correlation_reasons?: string[] | null;
          severity: "critical" | "high" | "medium" | "low" | "info";
          status?: "active" | "investigating" | "resolved" | "mitigated";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Insert"]>;
      };
      events: {
        Row: {
          id: number;
          event_id: string;
          tenant_id: string | null;
          timestamp: string;
          service: string;
          source: string;
          event_type: string;
          severity: "critical" | "high" | "medium" | "low" | "info";
          message: string;
          metadata: Json;
          embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          event_id: string;
          tenant_id?: string | null;
          timestamp?: string;
          service: string;
          source: string;
          event_type: string;
          severity: "critical" | "high" | "medium" | "low" | "info";
          message: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      event_relationships: {
        Row: {
          id: number;
          from_event_id: string;
          to_event_id: string;
          relationship: "PRECEDES" | "CAUSES" | "CORRELATES_WITH" | "BLOCKS" | string;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          from_event_id: string;
          to_event_id: string;
          relationship?: "PRECEDES" | "CAUSES" | "CORRELATES_WITH" | "BLOCKS" | string;
          confidence?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_relationships"]["Insert"]>;
      };
      incident_events: {
        Row: {
          id: number;
          incident_id: string;
          event_id: string;
          relationship: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          incident_id: string;
          event_id: string;
          relationship?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incident_events"]["Insert"]>;
      };
    };
    Views: {
      operational_events: {
        Row: {
          event_id: string | null;
          tenant_id: string | null;
          timestamp: string | null;
          service: string | null;
          source: string | null;
          event_type: string | null;
          severity: string | null;
          message: string | null;
          metadata: Json | null;
          created_at: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
  };
}
