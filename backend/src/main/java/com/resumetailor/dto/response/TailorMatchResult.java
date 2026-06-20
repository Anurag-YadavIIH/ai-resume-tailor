package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/** One existing tailored resume scored against a newly-pasted job description. */
public record TailorMatchResult(
        UUID tailoredResumeId,
        String originalJobTitle,
        String originalCompany,
        String roleCategory,
        String masterResumeLabel,
        int matchScore,
        JsonNode missingSkills,
        Instant createdAt
) {}
