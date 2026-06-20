package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        String location,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl,
        JsonNode skills,
        JsonNode certifications,
        JsonNode education,
        boolean googleLinked
) {}
