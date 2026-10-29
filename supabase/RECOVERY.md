# Récupération / re-provisioning Supabase — GaragePro

> Situation constatée le 29/10/2026 : le projet `nflyoqkmltjbopnozubm` ne répond plus
> (NXDOMAIN vérifié via DNS local + 1.1.1.1 + 8.8.8.8). Le site Vercel répond mais
> l'application est inutilisable (login et données impossibles).

## 1. Diagnostic (à faire dans le dashboard supabase.com)

- [ ] Projet présent dans la liste ? → s'il est **pausé**, cliquer « Restore » : tout
      revient, passer à l'étape 4.
- [ ] Projet supprimé ? → si la suppression est récente (< 30 jours sur certains plans),
      contacter le support Supabase pour restauration. Sinon, les données sont perdues
      et il faut repartir d'un projet neuf (étape 2).

## 2. Nouveau projet (si restauration impossible)

1. Créer le projet (région la plus proche, ex. eu-west / EU Central).
2. SQL Editor → exécuter, dans l'ordre :
   - `supabase/schema.sql` (schéma complet, RLS inclus)
   - `supabase/migrations/20261022000000_rls_anon_lockdown.sql` (verrou anon)
3. Authentication → Providers → Email : **désactiver « Allow new users to sign up »**.
   (Important : le trigger d'auto-création de profil attribue le rôle
   `receptionist`, qui a accès en lecture/écriture aux données métier.)
4. Créer le compte administrateur : Auth → Add user
   (email `mazenmaaref@gmail.com`, mot de passe définitif), puis SQL :

   ```sql
   update profiles set role = 'administrator'
   where email = 'mazenmaaref@gmail.com';
   ```

## 3. Rebrancher l'application

1. Copier Project URL + anon key (Settings → API).
2. Mettre à jour :
   - `.env.production` (repo — publishable, volontairement committé) → commit + push
   - **Vercel** → Project Settings → Environment Variables → remplacer
     `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` → Redeploy.
3. `.env` local (non commité) pour le développement.

## 4. Vérification de fin (discipline « prove it » — verdicts)

| Vérif | Commande/méthode | Verdict attendu |
|---|---|---|
| Anon bloqué | `curl <url>/rest/v1/customers -H "apikey: <anon>"` | `[]` ou 401/403 — jamais de données |
| Signup fermé | Tentative d'inscription via l'app ou REST | Erreur, aucun compte créé |
| Login admin | Connexion sur le site déployé | Dashboard avec données réelles |
| Flux complet | `node scripts/e2e-test.cjs <email> <mdp> 1` | Réception → tâches/pièces → paiement → livraison |

Aucun «ci-dessus réparé» ne doit être annoncé avant ces vérifications en condition réelle.
