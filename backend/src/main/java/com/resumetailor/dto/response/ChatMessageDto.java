package com.resumetailor.dto.response;

/** A single chat turn. role is "user" or "assistant". */
public record ChatMessageDto(String role, String content) {}
