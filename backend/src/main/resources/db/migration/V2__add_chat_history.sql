-- Chat-based refinement history: JSON array of {role, content} turns
ALTER TABLE tailored_resume ADD COLUMN chat_history TEXT;
