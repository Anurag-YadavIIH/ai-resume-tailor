package com.resumetailor.repository;

import com.resumetailor.entity.TailoredResume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TailoredResumeRepository extends JpaRepository<TailoredResume, UUID> {
    List<TailoredResume> findByMasterResumeIdOrderByCreatedAtDesc(UUID masterResumeId);

    List<TailoredResume> findByMasterResumeIdInOrderByCreatedAtDesc(Collection<UUID> masterResumeIds);
}
