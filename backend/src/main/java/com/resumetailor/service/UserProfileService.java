package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.resumetailor.dto.request.UserProfileRequest;
import com.resumetailor.dto.response.UserProfileResponse;
import com.resumetailor.entity.UserProfile;
import com.resumetailor.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    public UserProfileResponse getOrEmpty(UUID id) {
        return repository.findById(id)
                .map(this::toResponse)
                .orElse(emptyResponse(id));
    }

    public UserProfileResponse upsert(UUID id, UserProfileRequest req) {
        UserProfile profile = repository.findById(id)
                .orElse(UserProfile.builder().id(id).build());

        profile.setFullName(req.fullName());
        profile.setEmail(req.email());
        profile.setPhone(req.phone());
        profile.setLocation(req.location());
        profile.setLinkedinUrl(req.linkedinUrl());
        profile.setGithubUrl(req.githubUrl());
        profile.setPortfolioUrl(req.portfolioUrl());
        profile.setSkills(toJson(req.skills()));
        profile.setCertifications(toJson(req.certifications()));
        profile.setEducation(toJson(req.education()));

        return toResponse(repository.save(profile));
    }

    /** Called after Google login to link the Google sub to an existing profile. */
    public UserProfileResponse linkGoogle(UUID id, String googleSub, String name, String email) {
        UserProfile profile = repository.findById(id)
                .orElse(UserProfile.builder().id(id).build());
        profile.setGoogleSub(googleSub);
        if (profile.getFullName() == null) profile.setFullName(name);
        if (profile.getEmail() == null) profile.setEmail(email);
        return toResponse(repository.save(profile));
    }

    /** Build a contact JsonNode from profile for injection into the tailored resume. */
    public JsonNode buildContact(UserProfile profile) {
        ObjectNode contact = mapper.createObjectNode();
        contact.put("name", nvl(profile.getFullName()));
        contact.put("email", nvl(profile.getEmail()));
        contact.put("phone", nvl(profile.getPhone()));
        contact.put("location", nvl(profile.getLocation()));

        ArrayNode links = contact.putArray("links");
        if (hasValue(profile.getLinkedinUrl())) {
            ObjectNode l = links.addObject();
            l.put("label", "LinkedIn");
            l.put("url", profile.getLinkedinUrl());
        }
        if (hasValue(profile.getGithubUrl())) {
            ObjectNode l = links.addObject();
            l.put("label", "GitHub");
            l.put("url", profile.getGithubUrl());
        }
        if (hasValue(profile.getPortfolioUrl())) {
            ObjectNode l = links.addObject();
            l.put("label", "Portfolio");
            l.put("url", profile.getPortfolioUrl());
        }
        return contact;
    }

    public UserProfile find(UUID id) {
        return repository.findById(id)
                .orElse(null);
    }

    private UserProfileResponse toResponse(UserProfile p) {
        return new UserProfileResponse(
                p.getId(),
                p.getFullName(),
                p.getEmail(),
                p.getPhone(),
                p.getLocation(),
                p.getLinkedinUrl(),
                p.getGithubUrl(),
                p.getPortfolioUrl(),
                fromJson(p.getSkills()),
                fromJson(p.getCertifications()),
                fromJson(p.getEducation()),
                p.getGoogleSub() != null
        );
    }

    private UserProfileResponse emptyResponse(UUID id) {
        return new UserProfileResponse(id, null, null, null, null,
                null, null, null, null, null, null, false);
    }

    private String toJson(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return null;
        try { return mapper.writeValueAsString(node); } catch (Exception e) { return null; }
    }

    private JsonNode fromJson(String json) {
        if (json == null || json.isBlank()) return mapper.createArrayNode();
        try { return mapper.readTree(json); } catch (Exception e) { return mapper.createArrayNode(); }
    }

    private String nvl(String s) { return s == null ? "" : s; }
    private boolean hasValue(String s) { return s != null && !s.isBlank(); }
}
