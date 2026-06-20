package com.resumetailor.controller;

import com.resumetailor.dto.request.UserProfileRequest;
import com.resumetailor.dto.response.UserProfileResponse;
import com.resumetailor.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService profileService;

    /** Returns the profile for the given client-generated ID, or an empty profile object if not saved yet. */
    @GetMapping("/{id}")
    public UserProfileResponse get(@PathVariable UUID id) {
        return profileService.getOrEmpty(id);
    }

    /** Creates or updates (upserts) the profile for the given ID. */
    @PutMapping("/{id}")
    public UserProfileResponse upsert(@PathVariable UUID id, @RequestBody UserProfileRequest request) {
        return profileService.upsert(id, request);
    }
}
