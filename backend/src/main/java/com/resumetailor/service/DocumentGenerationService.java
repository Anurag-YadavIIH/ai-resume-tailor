package com.resumetailor.service;

import com.resumetailor.entity.JobDescription;
import com.resumetailor.entity.TailoredResume;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DocumentGenerationService {

    private final TailoringService tailoringService;
    private final JobService jobService;
    private final OpenAiService openAi;

    public String generateCoverLetter(java.util.UUID tailoredResumeId) {
        TailoredResume tr = tailoringService.find(tailoredResumeId);
        JobDescription job = jobService.find(tr.getJobDescriptionId());

        String prompt = """
                TAILORED RESUME (JSON):
                %s

                JOB (title/company/requirements JSON):
                %s
                """.formatted(tr.getContent(), job.getRequirements());

        String letter = openAi.completeTextFast(Prompts.COVER_LETTER_SYSTEM, prompt);
        tailoringService.saveCoverLetter(tailoredResumeId, letter);
        return letter;
    }

    public String generateRecruiterEmail(java.util.UUID tailoredResumeId) {
        TailoredResume tr = tailoringService.find(tailoredResumeId);
        JobDescription job = jobService.find(tr.getJobDescriptionId());

        String prompt = """
                TAILORED RESUME (JSON):
                %s

                JOB (title/company/requirements JSON):
                %s
                """.formatted(tr.getContent(), job.getRequirements());

        String email = openAi.completeTextFast(Prompts.RECRUITER_EMAIL_SYSTEM, prompt);
        tailoringService.saveRecruiterEmail(tailoredResumeId, email);
        return email;
    }
}
