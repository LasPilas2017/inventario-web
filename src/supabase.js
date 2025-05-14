import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oawmullhhxvdqozgswpi.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hd211bGxoaHh2ZHFvemdzd3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDgzMDUsImV4cCI6MjA2MjgyNDMwNX0.r_fgPVDOSfY3-m-2355L0ezmArMSHMNERyko7Vl30CI'; 
export const supabase = createClient(supabaseUrl, supabaseKey);