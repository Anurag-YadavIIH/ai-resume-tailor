package com.resumetailor.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Either paste raw job-description text (source="text") or a posting URL (source="url").
 */
public record JobDescriptionRequest(
        @NotBlank String source,
        @NotBlank String content
) {}
