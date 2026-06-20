package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record JobDescriptionResponse(
        UUID id,
        String source,
        String sourceUrl,
        String title,
        String company,
        String rawText,
        JsonNode requirements,
        Instant createdAt
) {}
