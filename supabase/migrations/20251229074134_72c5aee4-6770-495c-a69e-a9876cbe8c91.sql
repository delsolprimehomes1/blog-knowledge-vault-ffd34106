-- Drop the restrictive policy that checks user_id
DROP POLICY IF EXISTS "Users can view their own qa jobs" ON qa_generation_jobs;

-- Create a more permissive policy for authenticated users (admin feature)
CREATE POLICY "Authenticated users can view qa jobs"
ON qa_generation_jobs FOR SELECT
USING (auth.uid() IS NOT NULL);