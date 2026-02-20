-- Make option_d nullable to allow questions with only 3 options (A, B, C)
ALTER TABLE public.questions
  ALTER COLUMN option_d DROP NOT NULL;

-- Update the correct_option constraint to allow 'a', 'b', 'c' (and 'd' only if option_d is provided)
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_correct_option_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_correct_option_check
  CHECK (
    correct_option IN ('a', 'b', 'c') OR
    (correct_option = 'd' AND option_d IS NOT NULL AND option_d != '')
  );

COMMENT ON COLUMN public.questions.option_d IS 'Optional fourth option. If NULL or empty, question has only 3 options (A, B, C).';
