package com.resumetailor.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record DocumentRequest(
        @NotNull UUID tailoredResumeId
) {}
