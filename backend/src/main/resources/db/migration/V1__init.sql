-- Master resume: the user's canonical resume + AI-structured JSON
CREATE TABLE master_resume (
    id          UUID PRIMARY KEY,
    label       VARCHAR(255) NOT NULL,
    raw_text    TEXT NOT NULL,
    structured  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job description: pasted text or scraped URL + extracted requirements
CREATE TABLE job_description (
    id           UUID PRIMARY KEY,
    source       VARCHAR(16) NOT NULL,
    source_url   TEXT,
    raw_text     TEXT NOT NULL,
    title        VARCHAR(255),
    company      VARCHAR(255),
    requirements TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tailored output: rewritten resume JSON, gap analysis, LaTeX, letters
CREATE TABLE tailored_resume (
    id                 UUID PRIMARY KEY,
    master_resume_id   UUID NOT NULL REFERENCES master_resume(id) ON DELETE CASCADE,
    job_description_id UUID NOT NULL REFERENCES job_description(id) ON DELETE CASCADE,
    content            TEXT,
    missing_skills     TEXT,
    latex_source       TEXT,
    cover_letter       TEXT,
    recruiter_email    TEXT,
    match_score        INTEGER,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tailored_master ON tailored_resume(master_resume_id);
CREATE INDEX idx_tailored_job ON tailored_resume(job_description_id);
