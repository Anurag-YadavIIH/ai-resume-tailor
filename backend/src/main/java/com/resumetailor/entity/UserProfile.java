package com.resumetailor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_profile")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    private UUID id;

    @Column(name = "full_name")
    private String fullName;

    private String email;
    private String phone;
    private String location;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "portfolio_url")
    private String portfolioUrl;

    /** JSON array of skill strings. */
    @Column(columnDefinition = "text")
    private String skills;

    /** JSON array of {name, issuer, year} objects. */
    @Column(columnDefinition = "text")
    private String certifications;

    /** JSON array of {institution, degree, field, start, end, details} objects. */
    @Column(columnDefinition = "text")
    private String education;

    /** Populated when the user authenticates via Google. */
    @Column(name = "google_sub")
    private String googleSub;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
