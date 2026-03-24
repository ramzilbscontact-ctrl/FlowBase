-- Seed default pipeline stages
-- This migration inserts 6 default pipeline stages for the first authenticated user.
-- Stages are owner-scoped (pipeline_stages.owner_id is NOT NULL) so each user manages
-- their own stage list. In development, this migration seeds the initial admin's stages.
--
-- NOTE: In production, the app's deals page auto-seeds these stages if the table is
-- empty for the current user (handled in Phase 2 Plan 03 — deals page wiring).
-- This migration is a convenience for local dev and CI environments.

DO $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Get the first user from auth.users (the initial admin)
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  -- Only insert if this user has no stages yet
  IF v_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages WHERE owner_id = v_owner_id
  ) THEN
    INSERT INTO public.pipeline_stages (owner_id, name, position) VALUES
      (v_owner_id, 'Prospect',     0),
      (v_owner_id, 'Qualifié',     1),
      (v_owner_id, 'Proposition',  2),
      (v_owner_id, 'Négociation',  3),
      (v_owner_id, 'Gagné',        4),
      (v_owner_id, 'Perdu',        5);
  END IF;
END $$;
