import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjhyvzwgcyxizdzjbukg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaHl2endnY3l4aXpkempidWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMTQ1MzUsImV4cCI6MjA2MjU5MDUzNX0.bujzyXuPM1SZu-XP-m-16Rvl56viDG6WcqTtn9d0C04';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 