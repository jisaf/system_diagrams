import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials (publishable key - safe to commit)
const supabaseUrl = 'https://nlavjplhryynbdyubumj.supabase.co';
const supabaseAnonKey = 'sb_publishable_RvhGSkpc-ILlK7mi_uHxcg_WGoonOjj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => true;
