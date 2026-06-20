package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumetailor.dto.response.MasterResumeResponse;
import com.resumetailor.entity.MasterResume;
import com.resumetailor.exception.NotFoundException;
import com.resumetailor.repository.MasterResumeRepository;
import com.resumetailor.util.Hashing;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeService {

    private final MasterResumeRepository repository;
    private final OpenAiService openAi;
    private final ObjectMapper mapper = new ObjectMapper();

    public MasterResumeResponse uploadFromFile(MultipartFile file, String label, UUID profileId) {
        String text = extractText(file);
        return persist(label != null && !label.isBlank() ? label : file.getOriginalFilename(), text, profileId);
    }

    public MasterResumeResponse uploadFromText(String rawText, String label, UUID profileId) {
        return persist(label != null && !label.isBlank() ? label : "Master resume", rawText, profileId);
    }

    private MasterResumeResponse persist(String label, String rawText, UUID profileId) {
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalArgumentException("Resume text is empty.");
        }
        String hash = Hashing.sha256(rawText);

        // Identical resume text already parsed (by this user or another) — reuse the structured
        // JSON instead of spending another LLM call on the same extraction.
        Optional<MasterResume> cached = repository.findFirstByContentHashAndStructuredIsNotNullOrderByCreatedAtDesc(hash);
        String structured = cached.isPresent()
                ? cached.get().getStructured()
                : openAi.completeJsonFast(Prompts.EXTRACT_RESUME_SYSTEM, rawText).toString();
        if (cached.isPresent()) {
            log.info("Reusing structured extraction from master resume {} (skipped LLM)", cached.get().getId());
        }

        MasterResume entity = MasterResume.builder()
                .label(label)
                .rawText(rawText)
                .structured(structured)
                .profileId(profileId)
                .contentHash(hash)
                .build();
        entity = repository.save(entity);
        log.info("Stored master resume {} ({} chars)", entity.getId(), rawText.length());
        return toResponse(entity);
    }

    public MasterResumeResponse get(UUID id) {
        return toResponse(find(id));
    }

    public List<MasterResumeResponse> list() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    /** Resumes previously uploaded by this browser's profile, most recent first. */
    public List<MasterResumeResponse> listForProfile(UUID profileId) {
        return repository.findByProfileIdOrderByCreatedAtDesc(profileId).stream().map(this::toResponse).toList();
    }

    public MasterResume find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Master resume not found: " + id));
    }

    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("Master resume not found: " + id);
        }
        repository.deleteById(id);
    }

    private String extractText(MultipartFile file) {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        try (InputStream in = file.getInputStream()) {
            if (name.endsWith(".pdf")) {
                try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
                    return new PDFTextStripper().getText(doc);
                }
            } else if (name.endsWith(".docx")) {
                try (XWPFDocument doc = new XWPFDocument(in);
                     XWPFWordExtractor ex = new XWPFWordExtractor(doc)) {
                    return ex.getText();
                }
            } else {
                // .txt, .md, or unknown — read as UTF-8
                return new String(file.getBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read resume file: " + e.getMessage(), e);
        }
    }

    private MasterResumeResponse toResponse(MasterResume e) {
        return new MasterResumeResponse(
                e.getId(), e.getLabel(), e.getRawText(),
                readTree(e.getStructured()), e.getCreatedAt());
    }

    private JsonNode readTree(String json) {
        try {
            return json == null ? null : mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
