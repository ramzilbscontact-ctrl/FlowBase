-- Add priority column to tasks table
-- The original schema omitted this field; the legacy frontend used high/medium/low.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority text
    NOT NULL
    DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));

COMMENT ON COLUMN public.tasks.priority IS 'Task priority level: high, medium, or low';
