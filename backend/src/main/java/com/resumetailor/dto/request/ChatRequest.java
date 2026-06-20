package com.resumetailor.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String message,
        /** Current in-memory ResumeContent JSON from the editor (may include unsaved edits).
         *  If null, the backend falls back to the persisted entity content. */
        JsonNode content
) {}
