-- ============================================================================
-- GaragePro — Migration 2026-10-22 : verrouillage RLS contre les accès Anon
--
-- CONSTAT (vérifié en production via l'API REST avec la clé publique) :
--   Les 12 tables (customers, vehicles, repair_jobs, payments, invoices,
--   profiles…) répondaient HTTP 200 à une requête D'INVITÉ anonyme.
--   Cause : aucune politique SELECT n'était restreinte à « authenticated »,
--   donc `using (true)` s'appliquait aussi au rôle `anon`.
--
-- CONTENU DE LA MIGRATION (idempotent, aucune donnée modifiée) :
--   1. Toutes les politiques SELECT sont re-scopées `TO authenticated`.
--   2. Toutes les politiques d'écriture re-scopées `TO authenticated`.
--   3. Les privilèges de table du rôle `anon` sont retirés (défense en
--      profondeur ; les requêtes légitimes utilisent `authenticated`).
--   4. EXECUTE sur les fonctions PostgreSQL retiré à `anon` / `public`,
--      conservé pour `authenticated` + `service_role` (l'app appelle
--      `next_job_number` en session connectée).
--
--   IMPACT UTILISATEURS : aucun — tous les comptes du garage sont connectés
--   (les visiteurs sans compte ne voyaient JAMAIS être censés voir ces
--   données). Les workflows administrateur / réceptionniste / mécanicien
--   ne changent pas.
--
--   À exécuter dans le Supabase SQL Editor (Project -> SQL Editor) après
--   validation, ou via `supabase db push` si le CLI est configuré.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) SELECT : invités anonymes exclus
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'garage_settings', 'customers', 'vehicles',
    'repair_jobs', 'status_history', 'repair_tasks', 'spare_parts',
    'repair_parts', 'payments', 'invoices', 'stock_movements'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_select_all ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
    -- Défense en profondeur : anon ne doit même pas avoir de privilèges de table
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END;
$$;

-- profiles_select_own : re-scopé à authenticated (anon n'a rien à lire)
ALTER POLICY profiles_select_own ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Écritures : re-scopées à authenticated (le rôle in-table est déjà vérifié
--    par les clauses USING/WITH CHECK via profiles.role)
-- ---------------------------------------------------------------------------
ALTER POLICY profiles_manage_admin        ON public.profiles        TO authenticated;
ALTER POLICY settings_manage_admin        ON public.garage_settings  TO authenticated;
ALTER POLICY customers_manage_receptionist ON public.customers       TO authenticated;
ALTER POLICY vehicles_manage_receptionist  ON public.vehicles        TO authenticated;
ALTER POLICY repair_jobs_manage_staff      ON public.repair_jobs     TO authenticated;
ALTER POLICY status_history_insert_staff   ON public.status_history  TO authenticated;
ALTER POLICY repair_tasks_manage_staff     ON public.repair_tasks    TO authenticated;
ALTER POLICY spare_parts_manage_staff      ON public.spare_parts     TO authenticated;
ALTER POLICY repair_parts_manage_staff     ON public.repair_parts    TO authenticated;
ALTER POLICY payments_manage_receptionist  ON public.payments        TO authenticated;
ALTER POLICY invoices_manage_receptionist  ON public.invoices        TO authenticated;
ALTER POLICY stock_movements_manage_staff  ON public.stock_movements TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Fonctions : anon / public perdent EXECUTE
--    (next_job_number est appelé par l'app en session connectée → authenticated)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.next_job_number(int, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.next_job_number(int, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated, service_role;
-- (utilisée uniquement dans des politiques évaluées pour le rôle authenticated)

-- create_profile_on_signup : fonction de TRIGGER (non appelable via PostgREST),
-- exécutée par supabase_auth_admin lors des inscriptions — on ne la touche pas.

-- ---------------------------------------------------------------------------
-- Vérification rapide (repris de l'audit) : après migration, une requête anon
-- sur /rest/v1/customers doit renvoyer 401/403/42501.
-- Les politiques de plus haut niveau restent inchangées : mêmes rôles, mêmes
-- clauses USING / WITH CHECK → aucun changement de comportement pour le staff.
-- ============================================================================
