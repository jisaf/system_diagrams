import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials (publishable anon key - safe to commit)
const supabaseUrl = 'https://gnqfmzliimhxcoexasqv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducWZtemxpaW1oeGNvZXhhc3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzk3ODcsImV4cCI6MjA1NTgxNTc4N30.61DTCv3fpG7Z9dy7oI6g9lH-tq2qVUt9Z4WGXaFgO2U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => true;
