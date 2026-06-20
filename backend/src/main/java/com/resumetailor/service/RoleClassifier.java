package com.resumetailor.service;

import org.springframework.stereotype.Component;

/** Deterministic job-title -> role-category mapping, used to group tailored resumes on the dashboard. */
@Component
public class RoleClassifier {

    public String classify(String jobTitle) {
        if (jobTitle == null || jobTitle.isBlank()) return "Other";
        String t = " " + jobTitle.toLowerCase() + " ";

        if (t.contains("generative ai") || t.contains("gen ai") || t.contains("genai") || t.contains(" llm")) {
            return "Generative AI Engineer";
        }
        if (t.contains("computer vision") || t.contains(" cv engineer") || t.contains("vision engineer")) {
            return "Computer Vision Engineer";
        }
        if (t.contains("nlp") || t.contains("natural language")) {
            return "NLP Engineer";
        }
        if (t.contains("machine learning") || t.contains(" ml engineer") || t.contains(" mle ")) {
            return "Machine Learning Engineer";
        }
        if (t.contains("data scientist") || t.contains("data science")) {
            return "Data Scientist";
        }
        if (t.contains("data engineer")) {
            return "Data Engineer";
        }
        if (t.contains("devops") || t.contains("site reliability") || t.contains(" sre ")) {
            return "DevOps Engineer";
        }
        if (t.contains("backend") || t.contains("back-end") || t.contains("back end")) {
            return "Backend Engineer";
        }
        if (t.contains("frontend") || t.contains("front-end") || t.contains("front end")) {
            return "Frontend Engineer";
        }
        if (t.contains("full stack") || t.contains("fullstack") || t.contains("full-stack")) {
            return "Full-Stack Engineer";
        }
        if (t.contains("ai engineer") || t.contains("artificial intelligence")) {
            return "AI Engineer";
        }
        if (t.contains("software engineer") || t.contains("software developer")) {
            return "Software Engineer";
        }
        return "Other";
    }
}
