package com.resumetailor.repository;

import com.resumetailor.entity.MasterResume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MasterResumeRepository extends JpaRepository<MasterResume, UUID> {
    List<MasterResume> findByProfileIdOrderByCreatedAtDesc(UUID profileId);

    /** Any previously-parsed resume with identical text, regardless of who uploaded it — lets us reuse its structured JSON instead of calling the LLM again. */
    Optional<MasterResume> findFirstByContentHashAndStructuredIsNotNullOrderByCreatedAtDesc(String contentHash);
}
