package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/** Lightweight row for the dashboard list — avoids shipping full content/LaTeX per item. */
public record TailoredResumeSummary(
        UUID id,
        String jobTitle,
        String company,
        String roleCategory,
        String masterResumeLabel,
        Integer matchScore,
        Integer atsScore,
        JsonNode missingSkills,
        Instant createdAt
) {}
