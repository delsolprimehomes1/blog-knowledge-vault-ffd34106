UPDATE qa_generation_jobs 
SET status = 'failed', 
    error = 'Manually marked as failed - Swedish validation too strict',
    completed_at = NOW()
WHERE id = '77a4792a-e6d7-4dee-95a8-20595450588f'
AND status = 'stalled';