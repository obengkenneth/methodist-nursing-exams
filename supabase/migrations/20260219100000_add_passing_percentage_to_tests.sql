-- Add configurable passing percentage per test (default 50%)
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS passing_percentage INTEGER NOT NULL DEFAULT 50
    CHECK (passing_percentage >= 0 AND passing_percentage <= 100);
