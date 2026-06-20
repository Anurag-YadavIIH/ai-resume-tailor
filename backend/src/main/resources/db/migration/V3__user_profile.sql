-- User profile: personal info saved once, applied to every generated resume.
-- Keyed by a client-generated UUID (stored in browser localStorage).
-- When Google Auth is added, a google_sub column will be added and indexed.
CREATE TABLE user_profile (
    id              UUID PRIMARY KEY,
    full_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    location        VARCHAR(255),
    linkedin_url    VARCHAR(500),
    github_url      VARCHAR(500),
    portfolio_url   VARCHAR(500),
    skills          TEXT,            -- JSON array of strings
    certifications  TEXT,            -- JSON array of {name, issuer, year}
    education       TEXT,            -- JSON array of {institution, degree, field, start, end, details}
    google_sub      VARCHAR(255),    -- populated when user signs in with Google
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_profile_google_sub ON user_profile(google_sub) WHERE google_sub IS NOT NULL;
