-- UI refresh schema: time spent, test status/department, answer flagging

-- 0.1 Time spent on results (seconds; NULL for older results)
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;

-- 0.2 Test status (draft/active/completed) and department
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_status') THEN
    CREATE TYPE public.test_status AS ENUM ('draft', 'active', 'completed');
  END IF;
END $$;
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS status public.test_status NOT NULL DEFAULT 'active';
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS department TEXT;

-- 0.3 Flagging on answers (whether student flagged question during exam)
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
