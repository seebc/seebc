/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oiqptmuohdnvdtvklbnr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXB0bXVvaGRudmR0dmtsYm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjk2NzgsImV4cCI6MjA4OTcwNTY3OH0.xzf2-0kZKRYrSnn_VO1hcHMty7LQ4RB8Fw7Qvk-k7rE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
