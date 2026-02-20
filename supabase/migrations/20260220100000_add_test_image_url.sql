-- Add optional cover image URL for exam cards (student dashboard)
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.tests.image_url IS 'Optional URL for exam card cover image. When null, UI shows default placeholder.';
