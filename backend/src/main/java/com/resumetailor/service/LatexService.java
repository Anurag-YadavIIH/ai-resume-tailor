package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Renders the tailored resume JSON into a self-contained LaTeX document.
 * Uses only base LaTeX packages so it compiles with tectonic or a standard
 * TeX Live install without extra .sty files.
 */
@Service
public class LatexService {

    public String generate(JsonNode tailored) {
        JsonNode contact = tailored.path("contact");
        StringBuilder sb = new StringBuilder();

        sb.append(preamble());
        sb.append("\\begin{document}\n");

        // Header
        sb.append("\\begin{center}\n");
        sb.append("{\\LARGE \\bfseries ").append(esc(contact.path("name").asText(""))).append("}\\\\[4pt]\n");
        sb.append("{\\small ").append(contactLine(contact)).append("}\n");
        sb.append("\\end{center}\n");
        sb.append("\\vspace{2pt}\n");

        // Summary
        String summary = tailored.path("summary").asText("");
        if (!summary.isBlank()) {
            sb.append(section("Summary"));
            sb.append(esc(summary)).append("\n\n");
        }

        // Education (placed right after the summary, before skills)
        JsonNode education = tailored.path("education");
        if (education.isArray() && education.size() > 0) {
            sb.append(section("Education"));
            for (JsonNode ed : education) {
                sb.append("\\textbf{").append(esc(ed.path("institution").asText(""))).append("} \\hfill ");
                sb.append("{\\small ").append(esc(dateRange(ed))).append("}\\\\\n");
                String degree = ed.path("degree").asText("");
                String field = ed.path("field").asText("");
                String line = degree + (field.isBlank() ? "" : ", " + field);
                String details = ed.path("details").asText("");
                sb.append("\\textit{").append(esc(line)).append("}");
                if (!details.isBlank()) {
                    sb.append(" \\hfill {\\small ").append(esc(details)).append("}");
                }
                sb.append("\\\\\n");
                sb.append("\\vspace{2pt}\n");
            }
        }

        // Skills
        sb.append(renderSkills(tailored.path("skills")));

        // Experience
        JsonNode experience = tailored.path("experience");
        if (experience.isArray() && experience.size() > 0) {
            sb.append(section("Experience"));
            for (JsonNode job : experience) {
                sb.append("\\textbf{").append(esc(job.path("role").asText(""))).append("} \\hfill ");
                sb.append("{\\small ").append(esc(dateRange(job))).append("}\\\\\n");
                sb.append("\\textit{").append(esc(job.path("company").asText("")));
                String loc = job.path("location").asText("");
                if (!loc.isBlank()) sb.append(" --- ").append(esc(loc));
                sb.append("}\n");
                sb.append(bullets(job.path("bullets")));
                sb.append("\\vspace{2pt}\n");
            }
        }

        // Projects
        JsonNode projects = tailored.path("projects");
        if (projects.isArray() && projects.size() > 0) {
            sb.append(section("Projects"));
            for (JsonNode p : projects) {
                sb.append("\\textbf{").append(esc(p.path("name").asText("")));
                String link = p.path("link").asText("");
                if (isMeaningfulUrl(link)) {
                    sb.append("} \\href{").append(link).append("}{\\small [GitHub]}");
                } else {
                    sb.append("}");
                }
                JsonNode tech = p.path("tech");
                if (tech.isArray() && tech.size() > 0) {
                    List<String> t = new ArrayList<>();
                    tech.forEach(x -> t.add(esc(x.asText())));
                    sb.append(" \\hfill {\\small ").append(String.join(", ", t)).append("}\\\\\n");
                } else {
                    sb.append("\\\\\n");
                }
                sb.append(bullets(p.path("bullets")));
                sb.append("\\vspace{2pt}\n");
            }
        }

        // Certifications (optional — populated from user profile)
        JsonNode certs = tailored.path("certifications");
        if (certs.isArray() && certs.size() > 0) {
            sb.append(section("Certifications"));
            for (JsonNode c : certs) {
                String name = c.path("name").asText("");
                String issuer = c.path("issuer").asText("");
                String year = c.path("year").asText("");
                sb.append("\\textbf{").append(esc(name)).append("}");
                if (!issuer.isBlank()) sb.append(" --- \\textit{").append(esc(issuer)).append("}");
                if (!year.isBlank()) sb.append(" \\hfill {\\small ").append(esc(year)).append("}");
                sb.append("\\\\\n\\vspace{2pt}\n");
            }
        }

        sb.append("\\end{document}\n");
        return sb.toString();
    }

    private String preamble() {
        return """
                \\documentclass[10.5pt,a4paper]{article}
                \\usepackage[margin=0.55in,top=0.5in,bottom=0.5in]{geometry}
                \\usepackage{enumitem}
                \\usepackage{hyperref}
                \\usepackage{titlesec}
                \\usepackage[T1]{fontenc}
                \\usepackage{lmodern}
                \\hypersetup{colorlinks=true,urlcolor=blue}
                \\pagestyle{empty}
                \\setlength{\\parindent}{0pt}
                \\renewcommand{\\baselinestretch}{0.96}
                \\setlist[itemize]{leftmargin=1.1em,topsep=1pt,itemsep=0pt,parsep=0pt}
                \\titleformat{\\section}{\\normalsize\\bfseries\\scshape}{}{0pt}{}[\\titlerule]
                \\titlespacing{\\section}{0pt}{5pt}{2pt}
                """;
    }

    /**
     * Renders the skills section as compact lines, auto-detected per entry:
     *  - Categorized: entries shaped like "Category: item, item, item" (colon within the
     *    first ~30 chars, with content after it) render as their own bold-label line.
     *  - Flat tokens (e.g. "Java", "Docker") are joined into a single bullet-separated
     *    line under a generic "Skills" label so they never spread across a bulky grid.
     */
    private String renderSkills(JsonNode skills) {
        if (!skills.isArray() || skills.size() == 0) return "";

        List<String> categorized = new ArrayList<>();
        List<String> flat = new ArrayList<>();

        for (JsonNode s : skills) {
            String entry = s.asText("");
            if (entry.isBlank()) continue;
            int colon = entry.indexOf(':');
            if (colon > 0 && colon <= 30 && colon < entry.length() - 1) {
                categorized.add(entry);
            } else {
                flat.add(entry);
            }
        }

        if (categorized.isEmpty() && flat.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        sb.append(section("Skills"));

        for (String entry : categorized) {
            int colon = entry.indexOf(':');
            String label = entry.substring(0, colon).trim();
            String rest = entry.substring(colon + 1).trim();
            sb.append("\\textbf{").append(esc(label)).append(":} ")
              .append(esc(rest)).append("\\\\\n");
        }

        if (!flat.isEmpty()) {
            List<String> items = new ArrayList<>();
            flat.forEach(s -> items.add(esc(s)));
            sb.append("\\textbf{Skills:} ").append(String.join(", ", items)).append("\\\\\n");
        }

        sb.append("\n");
        return sb.toString();
    }

    private String section(String title) {
        return "\\section*{" + esc(title) + "}\n";
    }

    private String contactLine(JsonNode contact) {
        List<String> parts = new ArrayList<>();
        add(parts, contact.path("email").asText(""));
        add(parts, contact.path("phone").asText(""));
        add(parts, contact.path("location").asText(""));
        JsonNode links = contact.path("links");
        if (links.isArray()) {
            for (JsonNode link : links) {
                String url = link.path("url").asText("");
                String label = link.path("label").asText(url);
                if (isMeaningfulUrl(url)) {
                    parts.add("\\href{" + url + "}{" + esc(label) + "}");
                }
            }
        }
        return String.join(" $\\cdot$ ", parts);
    }

    private void add(List<String> list, String value) {
        if (value != null && !value.isBlank()) list.add(esc(value));
    }

    // Matches a bare domain root with no real path, e.g. "https://github.com/",
    // "github.com", "http://linkedin.com" — these are placeholder guesses an LLM
    // makes when it sees a label like "GitHub" but no actual link in the source
    // text. Never render them; a real profile/project link always has a path.
    private static final Pattern BARE_DOMAIN = Pattern.compile(
            "^(https?://)?(www\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/?$");

    private boolean isMeaningfulUrl(String url) {
        if (url == null || url.isBlank()) return false;
        return !BARE_DOMAIN.matcher(url.trim()).matches();
    }

    private String bullets(JsonNode arr) {
        if (!arr.isArray() || arr.size() == 0) return "";
        StringBuilder sb = new StringBuilder("\\begin{itemize}\n");
        for (JsonNode b : arr) {
            sb.append("  \\item ").append(esc(b.asText())).append("\n");
        }
        sb.append("\\end{itemize}\n");
        return sb.toString();
    }

    private String dateRange(JsonNode node) {
        String start = node.path("start").asText("");
        String end = node.path("end").asText("");
        if (start.isBlank() && end.isBlank()) return "";
        return start + (start.isBlank() || end.isBlank() ? "" : " -- ") + end;
    }

    /** Escape LaTeX special characters so AI-generated text never breaks compilation. */
    private String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\textbackslash{}")
                .replace("&", "\\&")
                .replace("%", "\\%")
                .replace("$", "\\$")
                .replace("#", "\\#")
                .replace("_", "\\_")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace("~", "\\textasciitilde{}")
                .replace("^", "\\textasciicircum{}");
    }
}
