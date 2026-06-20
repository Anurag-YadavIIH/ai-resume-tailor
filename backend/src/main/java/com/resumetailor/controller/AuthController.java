package com.resumetailor.controller;

import com.resumetailor.dto.response.UserProfileResponse;
import com.resumetailor.service.GoogleAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleAuthService googleAuthService;

    /**
     * Accepts a Google ID token from the frontend, verifies it against Google's public keys,
     * and links the Google account to the local profile identified by profileId.
     * Returns the updated profile so the frontend can refresh its state.
     *
     * Requires GOOGLE_CLIENT_ID to be set in environment; returns 501 otherwise.
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String credential = body.get("credential");   // Google ID token (JWT)
        String profileId  = body.get("profileId");    // local profile UUID from localStorage

        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "credential is required"));
        }

        if (!googleAuthService.isConfigured()) {
            return ResponseEntity.status(501)
                    .body(Map.of("error", "Google Sign-In is not configured on this server. Set GOOGLE_CLIENT_ID."));
        }

        UUID localProfileId = profileId != null ? UUID.fromString(profileId) : UUID.randomUUID();
        UserProfileResponse profile = googleAuthService.verifyAndLink(credential, localProfileId);
        return ResponseEntity.ok(profile);
    }
}
