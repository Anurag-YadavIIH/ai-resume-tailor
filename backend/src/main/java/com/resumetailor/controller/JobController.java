package com.resumetailor.controller;

import com.resumetailor.dto.request.JobDescriptionRequest;
import com.resumetailor.dto.response.JobDescriptionResponse;
import com.resumetailor.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    /** Ingest a job description from pasted text or a URL, returns extracted requirements. */
    @PostMapping
    public JobDescriptionResponse ingest(@Valid @RequestBody JobDescriptionRequest request) {
        return jobService.ingest(request);
    }

    @GetMapping("/{id}")
    public JobDescriptionResponse get(@PathVariable UUID id) {
        return jobService.get(id);
    }
}
