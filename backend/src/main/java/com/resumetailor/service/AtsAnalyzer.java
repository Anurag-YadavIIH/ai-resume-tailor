package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Deterministic ATS-readiness checklist — structural heuristics only (quantified bullets,
 * keyword density, section completeness), independent of any specific job. No LLM call.
 */
@Component
public class AtsAnalyzer {

    private static final Pattern HAS_DIGIT = Pattern.compile(".*\\d.*");

    public record Result(int score, List<String> issues) {}

    public Result analyze(JsonNode content) {
        List<String> issues = new ArrayList<>();
        int total = 0;
        int passed = 0;

        JsonNode contact = content.path("contact");
        total++;
        if (!contact.path("email").asText("").isBlank()) passed++;
        else issues.add("Missing email in contact info.");

        total++;
        if (!contact.path("phone").asText("").isBlank()) passed++;
        else issues.add("Missing phone number in contact info.");

        total++;
        String summary = content.path("summary").asText("");
        if (!summary.isBlank() && summary.trim().split("\\s+").length >= 15) passed++;
        else issues.add("Summary is missing or too short — aim for 2-3 full sentences.");

        total++;
        JsonNode skills = content.path("skills");
        if (skills.isArray() && skills.size() >= 5) passed++;
        else issues.add("Fewer than 5 skills listed — ATS keyword matching favors more.");

        total++;
        if (hasQuantifiedBullet(content)) passed++;
        else issues.add("No quantified achievements (numbers/%) found — ATS and recruiters favor measurable impact.");

        total++;
        if (bulletCountsReasonable(content)) passed++;
        else issues.add("Some sections have too many bullets — keep each role/project concise and scannable.");

        total++;
        JsonNode education = content.path("education");
        if (education.isArray() && education.size() > 0) passed++;
        else issues.add("Education section missing.");

        int score = total == 0 ? 100 : Math.round(passed * 100f / total);
        return new Result(score, issues);
    }

    private boolean hasQuantifiedBullet(JsonNode content) {
        for (JsonNode e : content.path("experience")) {
            for (JsonNode b : e.path("bullets")) {
                if (HAS_DIGIT.matcher(b.asText("")).matches()) return true;
            }
        }
        for (JsonNode p : content.path("projects")) {
            for (JsonNode b : p.path("bullets")) {
                if (HAS_DIGIT.matcher(b.asText("")).matches()) return true;
            }
        }
        return false;
    }

    private boolean bulletCountsReasonable(JsonNode content) {
        for (JsonNode e : content.path("experience")) {
            if (e.path("bullets").size() > 6) return false;
        }
        for (JsonNode p : content.path("projects")) {
            if (p.path("bullets").size() > 5) return false;
        }
        return true;
    }
}
