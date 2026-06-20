package com.resumetailor.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * A past tailored resume that already scores well against a newly-submitted job — offered
 * as a free reuse instead of spending another LLM call tailoring from scratch.
 */
public record TailorReuseSuggestion(
        UUID tailoredResumeId,
        String originalJobTitle,
        String originalCompany,
        String masterResumeLabel,
        int matchScoreForNewJob,
        Instant createdAt
) {}
