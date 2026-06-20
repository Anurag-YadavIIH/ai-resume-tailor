package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

/** Result of checking an existing tailored resume against an arbitrary job description. */
public record CompareResult(
        UUID jobDescriptionId,
        String jobTitle,
        String company,
        int matchScore,
        JsonNode missingSkills
) {}
