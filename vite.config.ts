import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Pour GitHub Pages : compatible chemin racine standard et sous-répertoire de dépôt
    const base = process.env.GITHUB_PAGES === 'true' || process.env.CI ? './' : '/';
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://jgzcznwurnqefcseougm.supabase.co'),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AlAV1AxacxXkLL8n7Su02g_0idiSK_L')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
