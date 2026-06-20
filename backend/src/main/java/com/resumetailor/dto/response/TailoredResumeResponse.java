package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TailoredResumeResponse(
        UUID id,
        UUID masterResumeId,
        UUID jobDescriptionId,
        JsonNode content,
        JsonNode missingSkills,
        String latexSource,
        String coverLetter,
        String recruiterEmail,
        Integer matchScore,
        Integer atsScore,
        Instant createdAt,
        List<ChatMessageDto> chatHistory
) {}
