package com.resumetailor.service;

import com.resumetailor.config.AppProperties;
import com.resumetailor.exception.AiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Compiles a LaTeX source string to PDF bytes by shelling out to a TeX engine.
 * Prefers `tectonic` (single self-contained binary). Falls back to `pdflatex`.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfService {

    private final AppProperties props;

    public byte[] compile(String latexSource) {
        try {
            Path workDir = Path.of(props.getLatex().getWorkDir(), UUID.randomUUID().toString());
            Files.createDirectories(workDir);
            Path texFile = workDir.resolve("resume.tex");
            Files.writeString(texFile, latexSource);

            String engine = props.getLatex().getEngine();
            boolean ok = run(engine, workDir, texFile);
            if (!ok && !"pdflatex".equals(engine)) {
                log.warn("{} failed, falling back to pdflatex", engine);
                ok = run("pdflatex", workDir, texFile);
            }

            Path pdf = workDir.resolve("resume.pdf");
            if (!ok || !Files.exists(pdf)) {
                throw new AiException("PDF compilation failed. Check that a LaTeX engine is installed.");
            }
            byte[] bytes = Files.readAllBytes(pdf);
            deleteQuietly(workDir.toFile());
            return bytes;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("PDF compilation error: " + e.getMessage(), e);
        }
    }

    private boolean run(String engine, Path workDir, Path texFile) throws Exception {
        ProcessBuilder pb;
        if ("tectonic".equals(engine)) {
            pb = new ProcessBuilder("tectonic", "--outdir", workDir.toString(),
                    "--keep-logs", "--synctex=0", texFile.toString());
        } else {
            pb = new ProcessBuilder("pdflatex", "-interaction=nonstopmode",
                    "-output-directory", workDir.toString(), texFile.toString());
        }
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(true);
        Process p = pb.start();
        String output = new String(p.getInputStream().readAllBytes());
        boolean finished = p.waitFor(60, TimeUnit.SECONDS);
        if (!finished) {
            p.destroyForcibly();
            log.error("{} timed out", engine);
            return false;
        }
        if (p.exitValue() != 0) {
            log.error("{} exited {}:\n{}", engine, p.exitValue(),
                    output.substring(0, Math.min(output.length(), 2000)));
        }
        return Files.exists(workDir.resolve("resume.pdf"));
    }

    private void deleteQuietly(File dir) {
        File[] files = dir.listFiles();
        if (files != null) for (File f : files) {
            if (f.isDirectory()) deleteQuietly(f);
            else f.delete();
        }
        dir.delete();
    }
}
