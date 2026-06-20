package com.resumetailor.controller;

import com.resumetailor.dto.response.MasterResumeResponse;
import com.resumetailor.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    /** Upload a PDF/DOCX/TXT master resume file. */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MasterResumeResponse upload(@RequestParam("file") MultipartFile file,
                                       @RequestParam(value = "label", required = false) String label,
                                       @RequestParam(value = "profileId", required = false) UUID profileId) {
        return resumeService.uploadFromFile(file, label, profileId);
    }

    /** Or submit raw pasted resume text. */
    @PostMapping("/text")
    public MasterResumeResponse uploadText(@RequestBody Map<String, String> body) {
        String profileId = body.get("profileId");
        return resumeService.uploadFromText(body.get("rawText"), body.get("label"),
                profileId == null || profileId.isBlank() ? null : UUID.fromString(profileId));
    }

    @GetMapping
    public List<MasterResumeResponse> list(@RequestParam(value = "profileId", required = false) UUID profileId) {
        return profileId == null ? resumeService.list() : resumeService.listForProfile(profileId);
    }

    @GetMapping("/{id}")
    public MasterResumeResponse get(@PathVariable UUID id) {
        return resumeService.get(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        resumeService.delete(id);
    }
}
