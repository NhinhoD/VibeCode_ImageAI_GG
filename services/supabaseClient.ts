import { createClient } from '@supabase/supabase-js'

// IMPORTANT: Replace 'YOUR_SUPABASE_ANON_KEY' with your Supabase project anon key.
// You can find these credentials in your Supabase project dashboard under Settings > API.
const supabaseUrl = 'https://hznmulhhhbuvyfkspioq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bm11bGhoaGJ1dnlma3NwaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTI3NTUsImV4cCI6MjA3ODg2ODc1NX0.IG-NqRkOorBkODRMp-__7-2Hoo9xHj6sUUXM_4xIbzM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);