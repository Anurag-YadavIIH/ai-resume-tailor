package com.resumetailor.dto.request;

import com.fasterxml.jackson.databind.JsonNode;

public record UserProfileRequest(
        String fullName,
        String email,
        String phone,
        String location,
        String linkedinUrl,
        String githubUrl,
        String portfolioUrl,
        JsonNode skills,          // array of strings
        JsonNode certifications,  // array of {name, issuer, year}
        JsonNode education        // array of {institution, degree, field, start, end, details}
) {}
