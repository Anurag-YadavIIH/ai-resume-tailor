package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Computes match score and missing-skills purely from keyword overlap between the
 * master resume text and the job's extracted requirements — no LLM call needed,
 * so the score stays deterministic and reproducible across runs.
 */
@Component
public class MatchAnalyzer {

    private final ObjectMapper mapper = new ObjectMapper();

    public record Result(int matchScore, ArrayNode missingSkills) {}

    /**
     * @param jobRawText the job posting's full text, used to count how many times each
     *                    missing skill is mentioned — more-repeated requirements are surfaced
     *                    first and weighted as higher severity, since they matter most to the JD.
     */
    public Result analyze(String masterRawText, JsonNode jobRequirements, String jobRawText) {
        String haystack = masterRawText == null ? "" : masterRawText.toLowerCase();
        String jdLower = jobRawText == null ? "" : jobRawText.toLowerCase();

        List<String> required = new ArrayList<>();
        collect(jobRequirements.path("hardSkills"), required);
        collect(jobRequirements.path("keywords"), required);
        List<String> niceToHave = new ArrayList<>();
        collect(jobRequirements.path("niceToHave"), niceToHave);

        Set<String> seen = new LinkedHashSet<>();
        List<ObjectNode> missingRequired = new ArrayList<>();
        List<ObjectNode> missingNiceToHave = new ArrayList<>();
        int matched = 0;
        int total = 0;

        for (String skill : required) {
            String key = skill.toLowerCase();
            if (!seen.add(key)) continue;
            total++;
            if (haystack.contains(key)) {
                matched++;
            } else {
                int mentions = countOccurrences(jdLower, key);
                missingRequired.add(missingEntry(skill, mentions >= 2 ? "high" : "medium", mentions,
                        "Not found in your master resume — add hands-on experience, a project, or a course covering " + skill + " if you have it."));
            }
        }
        for (String skill : niceToHave) {
            String key = skill.toLowerCase();
            if (!seen.add(key) || haystack.contains(key)) continue;
            int mentions = countOccurrences(jdLower, key);
            missingNiceToHave.add(missingEntry(skill, "low", mentions,
                    "A nice-to-have the posting mentions — worth adding if it applies to you."));
        }

        // Most-repeated requirements in the JD surface first within each tier.
        missingRequired.sort((a, b) -> b.path("mentions").asInt() - a.path("mentions").asInt());
        missingNiceToHave.sort((a, b) -> b.path("mentions").asInt() - a.path("mentions").asInt());

        ArrayNode missing = mapper.createArrayNode();
        missingRequired.forEach(missing::add);
        missingNiceToHave.forEach(missing::add);

        int score = total == 0 ? 100 : (int) Math.round((matched * 100.0) / total);
        return new Result(score, missing);
    }

    private int countOccurrences(String haystack, String needle) {
        if (needle == null || needle.isBlank()) return 0;
        int count = 0;
        int idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) != -1) {
            count++;
            idx += needle.length();
        }
        return count;
    }

    private ObjectNode missingEntry(String skill, String severity, int mentions, String suggestion) {
        ObjectNode entry = mapper.createObjectNode();
        entry.put("skill", skill);
        entry.put("severity", severity);
        entry.put("mentions", mentions);
        entry.put("suggestion", suggestion);
        return entry;
    }

    private void collect(JsonNode arr, List<String> out) {
        if (arr.isArray()) {
            arr.forEach(n -> {
                String s = n.asText("").trim();
                if (!s.isEmpty()) out.add(s);
            });
        }
    }
}
