package com.resumetailor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "job_description")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDescription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** "url" or "text" */
    @Column(nullable = false)
    private String source;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "raw_text", nullable = false, columnDefinition = "text")
    private String rawText;

    private String title;
    private String company;

    /** Extracted requirements JSON: hardSkills, softSkills, responsibilities, keywords, seniority. */
    @Column(columnDefinition = "text")
    private String requirements;

    /** SHA-256 of the raw text, used to skip re-extraction when the same posting is ingested again. */
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
