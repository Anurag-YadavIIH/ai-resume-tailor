package com.resumetailor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private OpenAi openai = new OpenAi();
    private Cors cors = new Cors();
    private Latex latex = new Latex();

    @Data
    public static class OpenAi {
        private String apiKey;
        private String baseUrl = "https://api.openai.com/v1";
        /** Quality model — used only for the main tailoring rewrite where output quality matters most. */
        private String model = "gpt-4o";
        /** Fast/cheap model — used for extraction, chat edits, cover letter, recruiter email. */
        private String fastModel = "gpt-4o-mini";
        private int timeoutSeconds = 90;
    }

    @Data
    public static class Cors {
        private String allowedOrigins = "http://localhost:5173";
    }

    @Data
    public static class Latex {
        private String engine = "tectonic";
        private String workDir = "/tmp/resume-latex";
    }
}
