package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumetailor.dto.response.UserProfileResponse;
import com.resumetailor.exception.AiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.UUID;

/**
 * Verifies Google ID tokens via Google's tokeninfo endpoint (no extra dependencies needed).
 * Set GOOGLE_CLIENT_ID env var to enable; returns 501 if unconfigured.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserProfileService profileService;

    @Value("${app.google.client-id:}")
    private String clientId;

    private final WebClient tokenInfoClient = WebClient.builder()
            .baseUrl("https://oauth2.googleapis.com")
            .build();

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank();
    }

    public UserProfileResponse verifyAndLink(String idToken, UUID localProfileId) {
        // Call Google's tokeninfo endpoint — validates signature + expiry server-side
        JsonNode claims;
        try {
            claims = tokenInfoClient.get()
                    .uri("/tokeninfo?id_token={token}", idToken)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            throw new AiException("Google token verification failed: " + e.getMessage());
        }

        if (claims == null || claims.has("error_description")) {
            throw new AiException("Invalid Google token: " +
                    (claims != null ? claims.path("error_description").asText() : "null response"));
        }

        // Verify the token was issued for our app
        String aud = claims.path("aud").asText("");
        if (!aud.equals(clientId)) {
            throw new AiException("Google token audience mismatch — possible token theft.");
        }

        String sub   = claims.path("sub").asText();
        String email = claims.path("email").asText();
        String name  = claims.path("name").asText(email);

        log.info("Google login: sub={} email={}", sub, email);
        return profileService.linkGoogle(localProfileId, sub, name, email);
    }
}
