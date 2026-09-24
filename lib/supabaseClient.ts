import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration Supabase par défaut (RGPD conforme UE)
export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AlAV1AxacxXkLL8n7Su02g_0idiSK_L';

export const getSupabaseConfig = () => {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('as_custom_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('as_custom_supabase_key') : null;
  return {
    url: (customUrl && customUrl.trim()) ? customUrl.trim() : DEFAULT_SUPABASE_URL,
    anonKey: (customKey && customKey.trim()) ? customKey.trim() : DEFAULT_SUPABASE_ANON_KEY,
    isCustom: !!(customUrl || customKey)
  };
};

export const setSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('as_custom_supabase_url', url.trim());
    } else {
      localStorage.removeItem('as_custom_supabase_url');
    }
    if (anonKey && anonKey.trim()) {
      localStorage.setItem('as_custom_supabase_key', anonKey.trim());
    } else {
      localStorage.removeItem('as_custom_supabase_key');
    }
  }
};

export const resetSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('as_custom_supabase_url');
    localStorage.removeItem('as_custom_supabase_key');
  }
};

const config = getSupabaseConfig();
export const SUPABASE_URL = config.url;
export const SUPABASE_ANON_KEY = config.anonKey;

export const supabase: SupabaseClient = createClient(config.url, config.anonKey);
