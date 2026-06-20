# Resume Tailor

An AI-powered resume tailoring workbench. Upload your master resume, drop in a job
description (text or URL), and the app extracts the role's requirements, finds your
skill gaps, rewrites your summary / skills / experience / projects to fit, and renders
a LaTeX-typeset PDF you can edit live and download. It also drafts a matching cover
letter and recruiter outreach email.

Built for personal job-hunting use.

---

## What's inside

| Layer       | Stack                                                              |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | React 18 + TypeScript + Vite + Tailwind, split-screen editor/preview |
| Backend     | Spring Boot 3.3 (Java 21), REST API, DTOs, services, repositories  |
| Database    | PostgreSQL 16 (Flyway migrations)                                  |
| AI          | OpenAI Chat Completions (`gpt-4o` by default)                      |
| PDF         | LaTeX compiled with Tectonic (PDFBox/POI for parsing uploads)      |
| Packaging   | Docker + docker-compose for one-command startup                   |

### Feature → implementation map

| # | Feature                          | Where it lives                                          |
| - | -------------------------------- | ------------------------------------------------------- |
| 1 | Upload master resume             | `ResumeController` + `ResumeService` (PDF/DOCX/txt)     |
| 2 | Paste job description or URL     | `JobController` + `JobService` (Jsoup fetch for URLs)   |
| 3 | Extract job requirements         | `JobService` → `Prompts.EXTRACT_JD_SYSTEM`              |
| 4 | Compare against master resume    | `TailoringService` → `Prompts.TAILOR_SYSTEM`            |
| 5 | Identify missing skills          | Tailor output `missingSkills` → `MissingSkills.tsx`     |
| 6 | Tailor summary/skills/projects/exp | `TailoringService.tailor()`                            |
| 7 | Preserve contact + education     | Enforced in prompt + `PreservedBlock` (read-only UI)    |
| 8 | Generate LaTeX resume            | `LatexService`                                          |
| 9 | Render PDF preview               | `PdfService` + `PreviewPane.tsx` (iframe)               |
| 10| Download PDF                     | `DocumentController` `/pdf/download`                    |
| 11| Generate cover letter            | `DocumentGenerationService` + `EditorPane` Cover tab    |
| 12| Generate recruiter email         | `DocumentGenerationService` + `EditorPane` Email tab    |

---

## Quick start (Docker — recommended)

Requires Docker Desktop. This is the simplest path because it bundles Postgres,
the JVM, Maven, **and** Tectonic (the LaTeX engine) for you — nothing else to install.

```bash
# 1. Add your OpenAI key
cp .env.example .env
#    then edit .env and set OPENAI_API_KEY=sk-...

# 2. Build and run everything
docker compose up --build
```

Then open:

- **App:** http://localhost:3000
- **API:** http://localhost:8080 (health: `/actuator/health`)

First build takes a few minutes (it downloads the Tectonic binary and Maven deps).
Stop with `Ctrl+C`; data persists in the `pgdata` volume.

---

## Local development (without Docker)

Use this if you want hot-reload while editing. You'll need to install the tooling
yourself.

**Prerequisites**
- Java 21 (JDK) and **Maven 3.9+**
- Node.js 20+
- PostgreSQL 16 running locally
- A LaTeX engine for PDF rendering — install [Tectonic](https://tectonic-typesetting.github.io/)
  (recommended) or a TeX distribution that provides `pdflatex`. Without one, every
  step works **except** PDF preview/download.

**1. Database** — create the db and user (matching `application.yml` defaults):

```sql
CREATE DATABASE resume_tailor;
CREATE USER resume WITH PASSWORD 'resume';
GRANT ALL PRIVILEGES ON DATABASE resume_tailor TO resume;
```

**2. Backend** (from `backend/`):

```bash
# PowerShell
$env:OPENAI_API_KEY="sk-..."
mvn spring-boot:run
```

Flyway creates the tables on first boot. API comes up on http://localhost:8080.

If your Tectonic/pdflatex binary isn't named the default, set `LATEX_ENGINE`
(e.g. `$env:LATEX_ENGINE="pdflatex"`).

**3. Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

Vite serves http://localhost:5173 and proxies `/api` to the backend on 8080.

---

## Configuration

All backend config is env-driven (see `backend/src/main/resources/application.yml`):

| Variable          | Default                                          | Notes                          |
| ----------------- | ------------------------------------------------ | ------------------------------ |
| `OPENAI_API_KEY`  | _(required)_                                     | Your OpenAI key                |
| `OPENAI_MODEL`    | `gpt-4o`                                          | Any Chat Completions model     |
| `DB_URL`          | `jdbc:postgresql://localhost:5432/resume_tailor` | JDBC URL                       |
| `DB_USER`         | `resume`                                         |                                |
| `DB_PASSWORD`     | `resume`                                         |                                |
| `CORS_ORIGINS`    | `http://localhost:3000,http://localhost:5173`    | Comma-separated                |
| `LATEX_ENGINE`    | `tectonic`                                        | `tectonic` or `pdflatex`       |
| `LATEX_WORKDIR`   | `/tmp/resume-latex`                              | Scratch dir for compilation    |
| `OPENAI_TIMEOUT`  | `240`                                            | Seconds to wait for an OpenAI completion        |

In Docker these are wired up in `docker-compose.yml`; you only need `.env`.

> **Heads up on `/tailor` latency:** it sends the full resume + job requirements in
> one prompt, and `gpt-4o` can take 1-3 minutes to respond. The frontend's nginx
> proxy allows up to 300s for `/api/` so a backend timeout error reaches the
> browser instead of a generic 504.

---

## How to use it

1. **Upload** your master resume (PDF, DOCX, or paste text) — this is parsed and
   structured once and reused.
2. **Add a job** — paste the description, or give a URL and let it scrape.
3. Hit **Tailor**. You land in the split-screen workbench: editable resume on the
   left, live PDF on the right, match score and skill gaps up top.
4. **Edit** any tailored section; contact details and education are locked to prevent
   accidental changes. Hit **Save & re-render** to refresh the PDF.
5. **Download** the PDF, or switch tabs to generate a **cover letter** and
   **recruiter email**.

---

## Project structure

```
resume-tailor/
├─ docker-compose.yml        # db + backend + frontend
├─ .env.example              # copy to .env, add your key
├─ backend/
│  ├─ Dockerfile             # multi-stage build, installs Tectonic
│  ├─ pom.xml
│  └─ src/main/
│     ├─ java/com/resumetailor/
│     │  ├─ config/          # CORS, OpenAI WebClient, properties
│     │  ├─ controller/      # REST endpoints
│     │  ├─ dto/             # request/response records
│     │  ├─ entity/          # JPA entities
│     │  ├─ exception/       # error handling
│     │  ├─ repository/      # Spring Data repos
│     │  └─ service/         # parsing, OpenAI, LaTeX, PDF, tailoring
│     └─ resources/
│        ├─ application.yml
│        └─ db/migration/    # Flyway SQL
└─ frontend/
   ├─ Dockerfile             # build → nginx
   ├─ nginx.conf
   └─ src/
      ├─ api/                # axios client
      ├─ components/         # IntakePanel, EditorPane, PreviewPane, ...
      ├─ types/
      └─ App.tsx
```

---

## Notes & caveats

- **OpenAI cost:** each tailor/cover-letter/email call hits the OpenAI API and uses
  tokens. `gpt-4o` is the default; set `OPENAI_MODEL` to a cheaper model if you like.
- **URL scraping:** many job boards (LinkedIn, Workday, etc.) block scraping or render
  via JavaScript. If a URL comes back thin or empty, just paste the description text.
- **JSON storage:** structured resume/job/tailored data is stored as JSON in `text`
  columns and parsed in the service layer (no `jsonb` querying needed) — simple and
  robust.
- **PDF rendering** needs a LaTeX engine. Docker includes Tectonic; for local runs
  install it yourself or PDF steps will fail while everything else works.
- The backend wasn't compiled in the environment that generated this scaffold (no
  Maven/network there). Build it with Docker or local Maven as above; the frontend
  production build is verified passing.
