import { createClient } from '@supabase/supabase-js';

// Configuration Supabase hébergée en Union Européenne (RGPD conforme Éducation nationale)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AlAV1AxacxXkLL8n7Su02g_0idiSK_L';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
