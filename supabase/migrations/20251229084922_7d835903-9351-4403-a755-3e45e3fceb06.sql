-- Prevent duplicate QA questions in the same language/cluster
CREATE UNIQUE INDEX IF NOT EXISTS unique_qa_question_per_language_cluster 
ON qa_pages (cluster_id, language, question_main) 
WHERE cluster_id IS NOT NULL;