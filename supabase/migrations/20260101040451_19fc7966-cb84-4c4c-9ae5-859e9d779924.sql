-- Add translations JSONB column to comparison_pages for hreflang linking
ALTER TABLE comparison_pages 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add index for efficient sibling lookups by hreflang_group_id
CREATE INDEX IF NOT EXISTS idx_comparison_pages_hreflang_group 
ON comparison_pages(hreflang_group_id) WHERE hreflang_group_id IS NOT NULL;

-- Add index for efficient topic-based lookups for finding translation groups
CREATE INDEX IF NOT EXISTS idx_comparison_pages_topic_lang 
ON comparison_pages(comparison_topic, language);