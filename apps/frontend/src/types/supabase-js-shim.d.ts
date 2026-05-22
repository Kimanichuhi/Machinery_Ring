// Workaround for a @supabase/supabase-js type regression where
// `InternalSupabaseKey` is referenced in the package's .d.mts without being declared.
//
// This MUST be a global (non-module) .d.ts so the identifier is visible when
// TypeScript checks node_modules.

declare const InternalSupabaseKey: unique symbol;
type InternalSupabaseKey = typeof InternalSupabaseKey;

