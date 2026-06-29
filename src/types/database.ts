/**
 * KPSS Aşkı - Supabase Database Types
 * Otomatik generate: npx supabase gen types typescript
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableRow = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableInsert = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableUpdate = Record<string, any>;

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: TableRow;
                Insert: TableInsert;
                Update: TableUpdate;
            };
            study_sessions: {
                Row: TableRow;
                Insert: TableInsert;
                Update: TableUpdate;
            };
            achievements: {
                Row: TableRow;
                Insert: TableInsert;
                Update: TableUpdate;
            };
            user_achievements: {
                Row: TableRow;
                Insert: TableInsert;
                Update: TableUpdate;
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
