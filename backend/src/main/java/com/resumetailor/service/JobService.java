package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumetailor.dto.request.JobDescriptionRequest;
import com.resumetailor.dto.response.JobDescriptionResponse;
import com.resumetailor.entity.JobDescription;
import com.resumetailor.exception.NotFoundException;
import com.resumetailor.repository.JobDescriptionRepository;
import com.resumetailor.util.Hashing;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobDescriptionRepository repository;
    private final OpenAiService openAi;
    private final ObjectMapper mapper = new ObjectMapper();

    public JobDescriptionResponse ingest(JobDescriptionRequest req) {
        String sourceUrl = null;

        if ("url".equalsIgnoreCase(req.source())) {
            sourceUrl = req.content().trim();
            // Same posting URL already ingested — reuse it without re-fetching or re-extracting.
            Optional<JobDescription> bySameUrl = repository.findFirstBySourceUrlOrderByCreatedAtDesc(sourceUrl);
            if (bySameUrl.isPresent()) {
                log.info("Reusing job description {} for already-seen URL (skipped fetch + LLM)", bySameUrl.get().getId());
                return toResponse(bySameUrl.get());
            }
        }

        String rawText = sourceUrl != null ? fetchUrlText(sourceUrl) : req.content();
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalArgumentException("Could not obtain job description text.");
        }

        String hash = Hashing.sha256(rawText);
        Optional<JobDescription> byHash = repository.findFirstByContentHashOrderByCreatedAtDesc(hash);
        if (byHash.isPresent()) {
            log.info("Reusing job description {} for identical posting text (skipped LLM)", byHash.get().getId());
            return toResponse(byHash.get());
        }

        JsonNode requirements = openAi.completeJsonFast(Prompts.EXTRACT_JD_SYSTEM, rawText);

        JobDescription entity = JobDescription.builder()
                .source(req.source().toLowerCase())
                .sourceUrl(sourceUrl)
                .rawText(rawText)
                .title(text(requirements, "title"))
                .company(text(requirements, "company"))
                .requirements(requirements.toString())
                .contentHash(hash)
                .build();

        entity = repository.save(entity);
        log.info("Stored job description {} ({})", entity.getId(), entity.getTitle());
        return toResponse(entity);
    }

    public JobDescription find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job description not found: " + id));
    }

    public JobDescriptionResponse get(UUID id) {
        return toResponse(find(id));
    }

    private String fetchUrlText(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; ResumeTailor/1.0)")
                    .timeout(15000)
                    .get();
            // Strip nav/script/style noise; the AI step will further structure it.
            doc.select("script, style, nav, footer, header, noscript").remove();
            String body = doc.body() != null ? doc.body().text() : doc.text();
            if (body.length() > 20000) {
                body = body.substring(0, 20000);
            }
            return body;
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Could not fetch the job posting URL. Some sites block scraping — paste the text instead. ("
                            + e.getMessage() + ")", e);
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private JobDescriptionResponse toResponse(JobDescription e) {
        return new JobDescriptionResponse(
                e.getId(), e.getSource(), e.getSourceUrl(), e.getTitle(), e.getCompany(),
                e.getRawText(), readTree(e.getRequirements()), e.getCreatedAt());
    }

    private JsonNode readTree(String json) {
        try {
            return json == null ? null : mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
