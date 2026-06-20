package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record MasterResumeResponse(
        UUID id,
        String label,
        String rawText,
        JsonNode structured,
        Instant createdAt
) {}
