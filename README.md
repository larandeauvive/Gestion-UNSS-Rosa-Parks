<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AS Rosa Parks - Gestion UNSS (Supabase EU & GitHub Pages)

Application de gestion sportive scolaire UNSS, conforme au RGPD et au cadre de l'Éducation nationale (hébergement des données en Union Européenne).

## Déploiement & Initialisation Supabase en 3 étapes :

1. **Créer les tables dans Supabase** :
   - Ouvrez votre console Supabase : [SQL Editor Supabase](https://supabase.com/dashboard/project/jgzcznwurnqefcseougm/sql/new)
   - Copiez-collez l'intégralité du fichier `supabase-schema.sql` et cliquez sur **Run**.

2. **Migrer les données depuis Firestore vers Supabase** :
   ```bash
   npm run migrate:supabase
   ```

3. **Déployer sur GitHub Pages** :
   ```bash
   npm run build:pages
   ```
   Publiez ensuite le contenu du dossier `dist` sur votre branche `gh-pages` (ou via GitHub Actions).

