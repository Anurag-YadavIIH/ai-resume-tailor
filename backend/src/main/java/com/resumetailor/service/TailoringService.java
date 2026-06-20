package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.resumetailor.dto.request.ChatRequest;
import com.resumetailor.dto.request.JobDescriptionRequest;
import com.resumetailor.dto.request.TailorRequest;
import com.resumetailor.dto.response.ChatMessageDto;
import com.resumetailor.dto.response.ChatResponse;
import com.resumetailor.dto.response.CompareResult;
import com.resumetailor.dto.response.JobDescriptionResponse;
import com.resumetailor.dto.response.MasterResumeResponse;
import com.resumetailor.dto.response.TailoredResumeResponse;
import com.resumetailor.dto.response.TailoredResumeSummary;
import com.resumetailor.dto.response.TailorMatchResult;
import com.resumetailor.dto.response.TailorReuseSuggestion;
import com.resumetailor.entity.JobDescription;
import com.resumetailor.entity.MasterResume;
import com.resumetailor.entity.TailoredResume;
import com.resumetailor.exception.AiException;
import com.resumetailor.exception.NotFoundException;
import com.resumetailor.repository.TailoredResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TailoringService {

    private final TailoredResumeRepository repository;
    private final ResumeService resumeService;
    private final JobService jobService;
    private final OpenAiService openAi;
    private final LatexService latexService;
    private final UserProfileService profileService;
    private final MatchAnalyzer matchAnalyzer;
    private final AtsAnalyzer atsAnalyzer;
    private final RoleClassifier roleClassifier;
    private final ObjectMapper mapper = new ObjectMapper();

    public TailoredResumeResponse tailor(TailorRequest req) {
        MasterResume master = resumeService.find(req.masterResumeId());
        JobDescription job = jobService.find(req.jobDescriptionId());

        String userPrompt = """
                MASTER RESUME (structured JSON):
                %s

                JOB REQUIREMENTS (structured JSON):
                %s

                Tone preference: %s
                """.formatted(
                master.getStructured(),
                job.getRequirements(),
                req.tone() == null ? "professional" : req.tone());

        JsonNode result = openAi.completeJson(Prompts.TAILOR_SYSTEM, userPrompt);

        JsonNode tailored = result.path("tailored");

        // Match score + gap analysis are deterministic keyword overlap, not LLM output —
        // reproducible across runs and costs no extra tokens.
        MatchAnalyzer.Result match = matchAnalyzer.analyze(master.getRawText(), readTree(job.getRequirements()), job.getRawText());

        // Override contact/education/certs with user profile if provided
        if (req.profileId() != null) {
            tailored = applyProfile(tailored, req.profileId());
        }

        String latex = latexService.generate(tailored);
        AtsAnalyzer.Result ats = atsAnalyzer.analyze(tailored);

        TailoredResume entity = TailoredResume.builder()
                .masterResumeId(master.getId())
                .jobDescriptionId(job.getId())
                .content(tailored.toString())
                .missingSkills(match.missingSkills().toString())
                .latexSource(latex)
                .matchScore(match.matchScore())
                .atsScore(ats.score())
                .build();

        entity = repository.save(entity);
        log.info("Created tailored resume {} (match {}%)", entity.getId(), match.matchScore());
        return toResponse(entity);
    }

    /** Overrides contact, education, and certifications from the user's saved profile. */
    private JsonNode applyProfile(JsonNode tailored, UUID profileId) {
        var profile = profileService.find(profileId);
        if (profile == null) return tailored;

        ObjectNode result = (ObjectNode) tailored.deepCopy();

        // Replace contact with profile data
        result.set("contact", profileService.buildContact(profile));

        // Replace education if profile has entries
        JsonNode profileEdu = readTree(profile.getEducation());
        if (profileEdu != null && profileEdu.isArray() && profileEdu.size() > 0) {
            result.set("education", profileEdu);
        }

        // Inject certifications (new section not produced by the AI)
        JsonNode profileCerts = readTree(profile.getCertifications());
        if (profileCerts != null && profileCerts.isArray() && profileCerts.size() > 0) {
            result.set("certifications", profileCerts);
        }

        return result;
    }

    public TailoredResume find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tailored resume not found: " + id));
    }

    public TailoredResumeResponse get(UUID id) {
        return toResponse(find(id));
    }

    /** Dashboard listing: every tailored resume derived from this profile's saved master resumes. */
    public List<TailoredResumeSummary> listForProfile(UUID profileId) {
        List<MasterResumeResponse> masters = resumeService.listForProfile(profileId);
        if (masters.isEmpty()) return List.of();

        Map<UUID, String> labelById = new LinkedHashMap<>();
        masters.forEach(m -> labelById.put(m.id(), m.label()));

        return repository.findByMasterResumeIdInOrderByCreatedAtDesc(labelById.keySet()).stream()
                .map(r -> {
                    JobDescription job = jobService.find(r.getJobDescriptionId());
                    JsonNode missing = readTree(r.getMissingSkills());
                    return new TailoredResumeSummary(
                            r.getId(), job.getTitle(), job.getCompany(), roleClassifier.classify(job.getTitle()),
                            labelById.get(r.getMasterResumeId()), r.getMatchScore(), r.getAtsScore(),
                            missing, r.getCreatedAt());
                })
                .toList();
    }

    /**
     * Scores every one of this profile's existing tailored resumes against a newly-pasted job
     * description, ranked best-first — lets the dashboard answer "which resume should I send for
     * this posting?" without tailoring anything new. Deterministic, no LLM call.
     */
    public List<TailorMatchResult> matchAcrossResumes(UUID profileId, JobDescriptionRequest req) {
        JobDescriptionResponse job = jobService.ingest(req);

        List<MasterResumeResponse> masters = resumeService.listForProfile(profileId);
        if (masters.isEmpty()) return List.of();

        Map<UUID, String> labelById = new LinkedHashMap<>();
        masters.forEach(m -> labelById.put(m.id(), m.label()));

        List<TailoredResume> rows = repository.findByMasterResumeIdInOrderByCreatedAtDesc(labelById.keySet());
        List<TailorMatchResult> results = new ArrayList<>();
        for (TailoredResume r : rows) {
            JsonNode content = readTree(r.getContent());
            String haystack = flattenResumeText(content);
            MatchAnalyzer.Result match = matchAnalyzer.analyze(haystack, job.requirements(), job.rawText());
            JobDescription originalJob = jobService.find(r.getJobDescriptionId());
            results.add(new TailorMatchResult(
                    r.getId(), originalJob.getTitle(), originalJob.getCompany(),
                    roleClassifier.classify(originalJob.getTitle()), labelById.get(r.getMasterResumeId()),
                    match.matchScore(), match.missingSkills(), r.getCreatedAt()));
        }
        results.sort((a, b) -> b.matchScore() - a.matchScore());
        return results;
    }

    /**
     * Checks an existing tailored resume against an arbitrary job description (not
     * necessarily the one it was tailored for) — deterministic, no LLM call, and doesn't
     * mutate the saved resume.
     */
    public CompareResult compare(UUID tailoredResumeId, JobDescriptionRequest req) {
        TailoredResume entity = find(tailoredResumeId);
        JobDescriptionResponse job = jobService.ingest(req);

        JsonNode content = readTree(entity.getContent());
        String haystack = flattenResumeText(content);
        MatchAnalyzer.Result match = matchAnalyzer.analyze(haystack, job.requirements(), job.rawText());

        return new CompareResult(job.id(), job.title(), job.company(), match.matchScore(), match.missingSkills());
    }

    /** Joins every searchable text field of a tailored resume's content into one haystack. */
    private String flattenResumeText(JsonNode content) {
        StringBuilder sb = new StringBuilder();
        sb.append(content.path("summary").asText("")).append(" ");
        content.path("skills").forEach(s -> sb.append(s.asText("")).append(" "));
        content.path("experience").forEach(e -> {
            sb.append(e.path("role").asText("")).append(" ").append(e.path("company").asText("")).append(" ");
            e.path("bullets").forEach(b -> sb.append(b.asText("")).append(" "));
        });
        content.path("projects").forEach(p -> {
            sb.append(p.path("name").asText("")).append(" ");
            p.path("tech").forEach(t -> sb.append(t.asText("")).append(" "));
            p.path("bullets").forEach(b -> sb.append(b.asText("")).append(" "));
        });
        return sb.toString();
    }

    private static final int REUSE_THRESHOLD = 80;

    /**
     * Checks a newly-submitted job against this profile's past tailored resumes. If one
     * already covers the new job's requirements well (deterministic match score, no LLM
     * call), it's offered as a free reuse instead of tailoring from scratch.
     */
    public List<TailorReuseSuggestion> suggestReuse(UUID profileId, UUID jobDescriptionId) {
        JobDescription newJob = jobService.find(jobDescriptionId);
        JsonNode newJobRequirements = readTree(newJob.getRequirements());

        List<MasterResumeResponse> masters = resumeService.listForProfile(profileId);
        if (masters.isEmpty()) return List.of();

        Map<UUID, String> labelById = new LinkedHashMap<>();
        masters.forEach(m -> labelById.put(m.id(), m.label()));

        List<TailoredResume> rows = repository.findByMasterResumeIdInOrderByCreatedAtDesc(labelById.keySet());
        if (rows.isEmpty()) return List.of();

        Map<UUID, String> rawTextById = new LinkedHashMap<>();
        List<TailorReuseSuggestion> suggestions = new ArrayList<>();
        for (TailoredResume r : rows) {
            String rawText = rawTextById.computeIfAbsent(
                    r.getMasterResumeId(), id -> resumeService.find(id).getRawText());
            MatchAnalyzer.Result match = matchAnalyzer.analyze(rawText, newJobRequirements, newJob.getRawText());
            if (match.matchScore() >= REUSE_THRESHOLD) {
                JobDescription originalJob = jobService.find(r.getJobDescriptionId());
                suggestions.add(new TailorReuseSuggestion(
                        r.getId(), originalJob.getTitle(), originalJob.getCompany(),
                        labelById.get(r.getMasterResumeId()), match.matchScore(), r.getCreatedAt()));
            }
        }
        suggestions.sort((a, b) -> b.matchScoreForNewJob() - a.matchScoreForNewJob());
        return suggestions;
    }

    /** Deletes a tailored resume (e.g. from the dashboard's cleanup action). */
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("Tailored resume not found: " + id);
        }
        repository.deleteById(id);
    }

    /** Save a manually-edited LaTeX string directly (bypasses JSON→LaTeX re-generation). */
    public TailoredResumeResponse saveLatex(UUID id, String latex) {
        TailoredResume entity = find(id);
        entity.setLatexSource(latex);
        entity = repository.save(entity);
        return toResponse(entity);
    }

    /** Re-generate LaTeX from edited content (frontend editor sends updated JSON). */
    public TailoredResumeResponse updateContent(UUID id, JsonNode editedContent) {
        TailoredResume entity = find(id);
        entity.setContent(editedContent.toString());
        entity.setLatexSource(latexService.generate(editedContent));
        entity.setAtsScore(atsAnalyzer.analyze(editedContent).score());
        entity = repository.save(entity);
        return toResponse(entity);
    }

    public TailoredResume saveCoverLetter(UUID id, String coverLetter) {
        TailoredResume entity = find(id);
        entity.setCoverLetter(coverLetter);
        return repository.save(entity);
    }

    public TailoredResume saveRecruiterEmail(UUID id, String email) {
        TailoredResume entity = find(id);
        entity.setRecruiterEmail(email);
        return repository.save(entity);
    }

    private static final int MAX_HISTORY_TURNS_IN_PROMPT = 12; // last N messages (~6 exchanges)
    private static final int MAX_HISTORY_TURNS_STORED = 40;

    /**
     * Apply a natural-language refinement to the tailored resume.
     * Persists the AI's edited content as the new content/latexSource (this also
     * saves any unsaved editor edits passed in req.content()), and appends both
     * chat turns to the persisted history.
     */
    public ChatResponse chat(UUID id, ChatRequest req) {
        TailoredResume entity = find(id);
        JobDescription job = jobService.find(entity.getJobDescriptionId());
        MasterResume master = resumeService.find(entity.getMasterResumeId());

        // Base content: prefer in-memory editor content (may include unsaved edits),
        // fall back to the persisted entity content if not supplied.
        JsonNode baseContent = req.content();
        if (baseContent == null || baseContent.isNull() || baseContent.isMissingNode()) {
            baseContent = readTree(entity.getContent());
        }
        if (baseContent == null) {
            throw new AiException("No resume content available to refine.");
        }

        List<ChatMessageDto> history = readHistory(entity.getChatHistory());
        String historyBlock = formatHistory(history);

        String userPrompt = """
                MASTER RESUME (original, structured JSON — use ONLY as source of truth for
                contact details like LinkedIn/GitHub links and original skill/project wording):
                %s

                CURRENT TAILORED RESUME (structured JSON — this is what you are editing):
                %s

                JOB REQUIREMENTS (structured JSON, for relevance judgments):
                %s

                RECENT CHAT HISTORY:
                %s

                NEW INSTRUCTION FROM USER:
                %s
                """.formatted(
                master.getStructured(),
                baseContent.toString(),
                job.getRequirements(),
                historyBlock.isBlank() ? "(none yet)" : historyBlock,
                req.message());

        JsonNode result = openAi.completeJsonFast(Prompts.REFINE_SYSTEM, userPrompt);

        JsonNode resume = result.path("resume");
        String reply = result.path("reply").asText("Done.");

        if (resume.isMissingNode() || resume.isNull() || !resume.isObject()) {
            throw new AiException("The AI did not return an updated resume. Please retry or rephrase.");
        }

        String latex = latexService.generate(resume);

        List<ChatMessageDto> updatedHistory = new ArrayList<>(history);
        updatedHistory.add(new ChatMessageDto("user", req.message()));
        updatedHistory.add(new ChatMessageDto("assistant", reply));
        if (updatedHistory.size() > MAX_HISTORY_TURNS_STORED) {
            updatedHistory = new ArrayList<>(
                    updatedHistory.subList(updatedHistory.size() - MAX_HISTORY_TURNS_STORED, updatedHistory.size()));
        }

        entity.setContent(resume.toString());
        entity.setLatexSource(latex);
        entity.setAtsScore(atsAnalyzer.analyze(resume).score());
        entity.setChatHistory(writeHistory(updatedHistory));
        entity = repository.save(entity);

        return new ChatResponse(reply, resume, latex, updatedHistory);
    }

    private List<ChatMessageDto> readHistory(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            ArrayNode arr = (ArrayNode) mapper.readTree(json);
            List<ChatMessageDto> out = new ArrayList<>();
            arr.forEach(n -> out.add(new ChatMessageDto(
                    n.path("role").asText(""), n.path("content").asText(""))));
            return out;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String writeHistory(List<ChatMessageDto> history) {
        try {
            return mapper.writeValueAsString(history);
        } catch (Exception e) {
            return "[]";
        }
    }

    /** Format the last N turns for the prompt to bound token usage. */
    private String formatHistory(List<ChatMessageDto> history) {
        if (history.isEmpty()) return "";
        int from = Math.max(0, history.size() - MAX_HISTORY_TURNS_IN_PROMPT);
        StringBuilder sb = new StringBuilder();
        for (ChatMessageDto m : history.subList(from, history.size())) {
            sb.append(m.role()).append(": ").append(m.content()).append("\n");
        }
        return sb.toString();
    }

    public TailoredResumeResponse toResponse(TailoredResume e) {
        return new TailoredResumeResponse(
                e.getId(), e.getMasterResumeId(), e.getJobDescriptionId(),
                readTree(e.getContent()), readTree(e.getMissingSkills()),
                e.getLatexSource(), e.getCoverLetter(), e.getRecruiterEmail(),
                e.getMatchScore(), e.getAtsScore(), e.getCreatedAt(),
                readHistory(e.getChatHistory()));
    }

    private JsonNode readTree(String json) {
        try {
            return json == null ? null : mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
