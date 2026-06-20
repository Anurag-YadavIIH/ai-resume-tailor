package com.resumetailor.controller;

import com.resumetailor.entity.TailoredResume;
import com.resumetailor.service.DocumentGenerationService;
import com.resumetailor.service.PdfService;
import com.resumetailor.service.TailoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final PdfService pdfService;
    private final TailoringService tailoringService;
    private final DocumentGenerationService docGen;

    /** Render the tailored resume LaTeX to a PDF (inline preview). */
    @GetMapping("/{tailoredResumeId}/pdf")
    public ResponseEntity<byte[]> renderPdf(@PathVariable UUID tailoredResumeId) {
        TailoredResume tr = tailoringService.find(tailoredResumeId);
        byte[] pdf = pdfService.compile(tr.getLatexSource());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=resume.pdf")
                .body(pdf);
    }

    /** Download the tailored resume PDF as an attachment. */
    @GetMapping("/{tailoredResumeId}/pdf/download")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID tailoredResumeId) {
        TailoredResume tr = tailoringService.find(tailoredResumeId);
        byte[] pdf = pdfService.compile(tr.getLatexSource());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tailored-resume.pdf")
                .body(pdf);
    }

    /** Expose the raw LaTeX source (for download or external compilation). */
    @GetMapping(value = "/{tailoredResumeId}/latex", produces = "application/x-tex")
    public ResponseEntity<String> latex(@PathVariable UUID tailoredResumeId) {
        TailoredResume tr = tailoringService.find(tailoredResumeId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resume.tex")
                .body(tr.getLatexSource());
    }

    @PostMapping("/{tailoredResumeId}/cover-letter")
    public Map<String, String> coverLetter(@PathVariable UUID tailoredResumeId) {
        return Map.of("coverLetter", docGen.generateCoverLetter(tailoredResumeId));
    }

    @PostMapping("/{tailoredResumeId}/recruiter-email")
    public Map<String, String> recruiterEmail(@PathVariable UUID tailoredResumeId) {
        return Map.of("recruiterEmail", docGen.generateRecruiterEmail(tailoredResumeId));
    }
}
