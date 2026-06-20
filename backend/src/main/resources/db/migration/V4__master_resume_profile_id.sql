ALTER TABLE master_resume ADD COLUMN profile_id UUID;
CREATE INDEX idx_master_resume_profile_id ON master_resume(profile_id);
