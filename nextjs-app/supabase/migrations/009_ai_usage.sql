-- AI Usage tracking for command bar (free plan: 50 requests/day)
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Index for fast lookups by user + date
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, date);

-- RLS policies
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update own AI usage"
  ON ai_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to increment AI usage (upsert pattern)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_tokens INTEGER DEFAULT 0)
RETURNS TABLE(request_count INTEGER, token_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO ai_usage (user_id, date, request_count, token_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, p_tokens, now())
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    request_count = ai_usage.request_count + 1,
    token_count = ai_usage.token_count + p_tokens,
    updated_at = now()
  RETURNING ai_usage.request_count, ai_usage.token_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
