-- Allow students to update their own result (for retakes) and delete their own answer rows
CREATE POLICY "Students can update their own results" ON public.results
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own answers" ON public.answers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.results WHERE id = result_id AND student_id = auth.uid())
  );
