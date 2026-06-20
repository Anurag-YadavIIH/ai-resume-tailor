package com.resumetailor.repository;

import com.resumetailor.entity.JobDescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface JobDescriptionRepository extends JpaRepository<JobDescription, UUID> {
    /** Reuse a previous extraction when the exact same posting text was already ingested. */
    Optional<JobDescription> findFirstByContentHashOrderByCreatedAtDesc(String contentHash);

    /** Reuse a previous extraction when the exact same URL was already ingested. */
    Optional<JobDescription> findFirstBySourceUrlOrderByCreatedAtDesc(String sourceUrl);
}
