-- Lets us skip the LLM extraction call entirely when the exact same job posting
-- or resume text has already been processed before.
ALTER TABLE job_description ADD COLUMN content_hash VARCHAR(64);
CREATE INDEX idx_job_description_content_hash ON job_description(content_hash);

ALTER TABLE master_resume ADD COLUMN content_hash VARCHAR(64);
CREATE INDEX idx_master_resume_content_hash ON master_resume(content_hash);
