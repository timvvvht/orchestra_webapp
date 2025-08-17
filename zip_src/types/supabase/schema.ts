export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
    public: {
        Tables: {
            agent_configs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    version: string;
                    ai_config: Json;
                    agent_details: Json;
                    tool_groups: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    version?: string;
                    ai_config: Json;
                    agent_details: Json;
                    tool_groups?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    version?: string;
                    ai_config?: Json;
                    agent_details?: Json;
                    tool_groups?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            chat_sessions: {
                Row: {
                    id: string;
                    user_id: string | null;
                    agent_config_id: string | null;
                    name: string;
                    avatar_url: string | null;
                    created_at: string;
                    last_message_at: string | null;
                    metadata: Json | null;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    agent_config_id?: string | null;
                    name: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    last_message_at?: string | null;
                    metadata?: Json | null;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    agent_config_id?: string | null;
                    name?: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    last_message_at?: string | null;
                    metadata?: Json | null;
                };
            };
            chat_messages: {
                Row: {
                    id: string;
                    session_id: string;
                    role: string;
                    content: Json;
                    timestamp: string;
                    model_used: string | null;
                    tool_call_id: string | null;
                    responding_to_tool_use_id: string | null;
                };
                Insert: {
                    id?: string;
                    session_id: string;
                    role: string;
                    content: Json;
                    timestamp?: string;
                    model_used?: string | null;
                    tool_call_id?: string | null;
                    responding_to_tool_use_id?: string | null;
                };
                Update: {
                    id?: string;
                    session_id?: string;
                    role?: string;
                    content?: Json;
                    timestamp?: string;
                    model_used?: string | null;
                    tool_call_id?: string | null;
                    responding_to_tool_use_id?: string | null;
                };
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
}

// Helper types for Supabase tables
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Specific table types
export type AgentConfig = Tables<'agent_configs'>;
export type InsertAgentConfig = InsertTables<'agent_configs'>;
export type UpdateAgentConfig = UpdateTables<'agent_configs'>;

export type ChatSession = Tables<'chat_sessions'>;
export type InsertChatSession = InsertTables<'chat_sessions'>;
export type UpdateChatSession = UpdateTables<'chat_sessions'>;

export type ChatMessage = Tables<'chat_messages'>;
export type InsertChatMessage = InsertTables<'chat_messages'>;
export type UpdateChatMessage = UpdateTables<'chat_messages'>;
