package com.resumetailor.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumetailor.dto.request.ChatRequest;
import com.resumetailor.dto.request.JobDescriptionRequest;
import com.resumetailor.dto.request.TailorRequest;
import com.resumetailor.dto.response.ChatResponse;
import com.resumetailor.dto.response.CompareResult;
import com.resumetailor.dto.response.TailoredResumeResponse;
import com.resumetailor.dto.response.TailoredResumeSummary;
import com.resumetailor.dto.response.TailorMatchResult;
import com.resumetailor.dto.response.TailorReuseSuggestion;
import com.resumetailor.service.TailoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tailor")
@RequiredArgsConstructor
public class TailorController {

    private final TailoringService tailoringService;

    /** Run the full tailoring pipeline: compare, gap-analyse, rewrite, score, generate LaTeX. */
    @PostMapping
    public TailoredResumeResponse tailor(@Valid @RequestBody TailorRequest request) {
        return tailoringService.tailor(request);
    }

    @GetMapping("/{id}")
    public TailoredResumeResponse get(@PathVariable UUID id) {
        return tailoringService.get(id);
    }

    /** Checks a newly-ingested job against this profile's past tailored resumes for a free reuse. */
    @GetMapping("/suggestions")
    public List<TailorReuseSuggestion> suggestions(
            @RequestParam UUID profileId, @RequestParam UUID jobDescriptionId) {
        return tailoringService.suggestReuse(profileId, jobDescriptionId);
    }

    /** Dashboard listing: every tailored resume for this browser's profile. */
    @GetMapping
    public List<TailoredResumeSummary> list(@RequestParam(required = false) UUID profileId) {
        return profileId == null ? List.of() : tailoringService.listForProfile(profileId);
    }

    /** Scores every existing tailored resume for this profile against a newly-pasted job description. */
    @PostMapping("/match")
    public List<TailorMatchResult> matchAcrossResumes(
            @RequestParam UUID profileId, @Valid @RequestBody JobDescriptionRequest request) {
        return tailoringService.matchAcrossResumes(profileId, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        tailoringService.delete(id);
    }

    /** Persist edits made in the split-screen editor and re-render LaTeX. */
    @PutMapping("/{id}/content")
    public TailoredResumeResponse updateContent(@PathVariable UUID id, @RequestBody JsonNode content) {
        return tailoringService.updateContent(id, content);
    }

    /** Checks an existing tailored resume against any job description — read-only, no LLM call. */
    @PostMapping("/{id}/compare")
    public CompareResult compare(@PathVariable UUID id, @Valid @RequestBody JobDescriptionRequest request) {
        return tailoringService.compare(id, request);
    }

    /** Apply a natural-language refinement via chat; persists result + history. */
    @PostMapping("/{id}/chat")
    public ChatResponse chat(@PathVariable UUID id, @Valid @RequestBody ChatRequest request) {
        return tailoringService.chat(id, request);
    }

    /** Save a manually-edited LaTeX string (from the Overleaf-style editor). No AI involved. */
    @PatchMapping("/{id}/latex")
    public TailoredResumeResponse saveLatex(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return tailoringService.saveLatex(id, body.getOrDefault("latex", ""));
    }
}
