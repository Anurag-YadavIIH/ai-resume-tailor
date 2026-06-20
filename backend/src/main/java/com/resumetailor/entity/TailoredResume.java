package com.resumetailor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tailored_resume")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TailoredResume {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "master_resume_id", nullable = false)
    private UUID masterResumeId;

    @Column(name = "job_description_id", nullable = false)
    private UUID jobDescriptionId;

    /** Full tailored resume JSON (summary, skills, experience, projects, plus preserved contact/education). */
    @Column(columnDefinition = "text")
    private String content;

    /** Gap analysis: skills present in the JD but missing/weak in the master resume. */
    @Column(name = "missing_skills", columnDefinition = "text")
    private String missingSkills;

    @Column(name = "latex_source", columnDefinition = "text")
    private String latexSource;

    @Column(name = "cover_letter", columnDefinition = "text")
    private String coverLetter;

    @Column(name = "recruiter_email", columnDefinition = "text")
    private String recruiterEmail;

    /** Chat-based refinement history: JSON array of {role, content} turns. */
    @Column(name = "chat_history", columnDefinition = "text")
    private String chatHistory;

    @Column(name = "match_score")
    private Integer matchScore;

    /** Deterministic ATS-readiness heuristic score (0-100), independent of any specific job. */
    @Column(name = "ats_score")
    private Integer atsScore;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
