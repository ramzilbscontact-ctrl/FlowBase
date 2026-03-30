-- =============================================================
-- 008_notion_tokens.sql — Notion OAuth token storage
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notion_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  workspace_id text,
  workspace_name text,
  bot_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notion tokens"
  ON public.notion_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
