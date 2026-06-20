package com.resumetailor.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TailorRequest(
        @NotNull UUID masterResumeId,
        @NotNull UUID jobDescriptionId,
        String tone,      // optional: "professional" (default), "concise", "enthusiastic"
        UUID profileId    // optional: if set, profile contact/education/certs override AI output
) {}
