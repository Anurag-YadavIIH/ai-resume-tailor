package com.resumetailor.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

public record ChatResponse(
        String reply,
        JsonNode content,
        String latexSource,
        List<ChatMessageDto> chatHistory
) {}
