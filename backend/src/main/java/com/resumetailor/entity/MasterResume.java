package com.resumetailor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * The user's canonical resume. Contact details and education are preserved
 * verbatim through every tailoring pass — only summary, skills, projects and
 * experience are rewritten.
 */
@Entity
@Table(name = "master_resume")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MasterResume {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String label;

    @Column(name = "raw_text", nullable = false, columnDefinition = "text")
    private String rawText;

    /** Structured JSON parsed from the resume (contact, education, skills, experience, projects). */
    @Column(name = "structured", columnDefinition = "text")
    private String structured;

    /** Scopes this resume to the uploading browser's profile so it can be reused later. */
    @Column(name = "profile_id")
    private UUID profileId;

    /** SHA-256 of the raw text, used to skip re-extraction when identical text was already parsed. */
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
