# AI Resume Tailor

An AI-powered resume tailoring workbench: upload a master resume once, paste in any
job description, and get back a rewritten, ATS-checked, LaTeX-typeset resume —
plus a deterministic gap analysis, a matching cover letter, and a recruiter
outreach email. A dashboard tracks every resume you've tailored, scores it against
new postings on demand, and points you at free resources to close your most common
skill gaps.

**Live demo:** <https://ai-resume-tailor-rho.vercel.app>

---

## Highlights

- **Tailor a resume to a job** — rewrites summary, skills, experience, and project
  bullets to match a job description, while contact details and education are
  locked and copied through verbatim (never fabricated).
- **Deterministic match score & ATS score** — both computed via keyword-overlap and
  structural heuristics, not the LLM, so they're reproducible and cost no extra
  tokens. Skill gaps are prioritized by how often they're actually mentioned in the
  job posting.
- **Dashboard** — every tailored resume grouped by role category (Machine Learning
  Engineer, Generative AI Engineer, Backend Engineer, ...), with stats, trend
  insights, and management for your saved master resumes.
- **"Which resume fits this job?"** — paste any job description and every tailored
  resume you already have gets ranked against it instantly, no AI call, with a
  free-reuse suggestion if one's already a strong fit.
- **Skill-gap learning page** — click any missing skill to get curated YouTube /
  free-course / certification search links for closing it.
- **Live LaTeX editor + PDF preview**, chat-based natural-language refinement,
  cover letter and recruiter email generation.
- **Cost-conscious by design** — identical resumes/job postings are deduplicated
  before ever calling the LLM, and the OpenAI-compatible endpoint is swappable to a
  free provider (e.g. Groq) via one environment variable.

---

## What's inside

| Layer       | Stack                                                                |
| ----------- | --------------------------------------------------------------------- |
| Frontend    | React 18 + TypeScript + Vite + Tailwind, multi-view SPA (Home, Dashboard, Intake, split-screen editor) |
| Backend     | Spring Boot 3.3 (Java 21), REST API, DTOs, services, repositories     |
| Database    | PostgreSQL 16 (Flyway migrations)                                     |
| AI          | Any OpenAI-compatible Chat Completions API — OpenAI (`gpt-4o`) by default, free providers like Groq work via config |
| PDF         | LaTeX compiled with Tectonic (PDFBox/POI for parsing uploads)         |
| Packaging   | Docker + docker-compose for one-command local startup                 |
| Deployment  | Render (backend) + Vercel (frontend) + Neon (Postgres) — all free-tier, see [`DEPLOY.md`](DEPLOY.md) |

### Feature → implementation map

| Feature                                   | Where it lives                                                    |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Upload master resume (PDF/DOCX/text)       | `ResumeController` + `ResumeService`                                |
| Resume/job dedup (skip the LLM on repeats) | `Hashing` + content-hash lookups in `ResumeService` / `JobService`  |
| Paste job description or URL               | `JobController` + `JobService` (Jsoup fetch for URLs)               |
| Extract job requirements                   | `JobService` → `Prompts.EXTRACT_JD_SYSTEM`                          |
| Tailor summary/skills/experience/projects  | `TailoringService.tailor()` → `Prompts.TAILOR_SYSTEM`               |
| Deterministic match score + skill gaps     | `MatchAnalyzer` (keyword overlap, JD-mention-frequency weighted)    |
| Deterministic ATS-readiness score          | `AtsAnalyzer` (contact/summary/skills/quantified-bullets heuristics)|
| Role categorization (ML/GenAI/Backend/...) | `RoleClassifier`                                                    |
| Reuse a past resume for a similar new job  | `TailoringService.suggestReuse()` + `IntakePanel.tsx`               |
| "Which resume fits this job?" dashboard tool | `TailoringService.matchAcrossResumes()` + `DashboardPage.tsx`     |
| Compare one tailored resume to any JD      | `TailoringService.compare()`                                        |
| Dashboard insights (trends, top gaps)      | `DashboardPage.tsx` (computed client-side from your own history)    |
| Skill-gap learning resources                | `LearningPage.tsx` (search-deep-links only, never fabricated URLs) |
| Preserve contact + education               | Enforced in prompt + `PreservedBlock` (read-only UI)                 |
| Generate LaTeX resume                      | `LatexService`                                                      |
| Render/download PDF preview                | `PdfService` + `PreviewPane.tsx` / `DocumentController`             |
| Live LaTeX editor                          | `LatexEditorPage.tsx` (Monaco editor + live recompile)              |
| Chat-based natural-language refinement     | `TailoringService.chat()` → `Prompts.REFINE_SYSTEM` + `ChatPanel.tsx`|
| Generate cover letter / recruiter email    | `DocumentGenerationService` + `EditorPane` tabs                      |
| Profile + Google sign-in                   | `UserProfileService` / `GoogleAuthService` + `LoginPage.tsx`         |

---

## Quick start (Docker — recommended)

Requires Docker Desktop. This bundles Postgres, the JVM, Maven, **and** Tectonic
(the LaTeX engine) for you — nothing else to install.

```bash
# 1. Add your OpenAI (or OpenAI-compatible) API key
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

## Deploying for free

See [`DEPLOY.md`](DEPLOY.md) for a full walkthrough: Neon (Postgres), Render
(backend + LaTeX compiler), Vercel (frontend), and Groq as a free
OpenAI-compatible LLM provider — no code changes required, only environment
variables.

---

## Configuration

All backend config is env-driven (see `backend/src/main/resources/application.yml`):

| Variable             | Default                                          | Notes                                          |
| --------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `OPENAI_API_KEY`     | _(required)_                                      | Key for your chosen provider                    |
| `OPENAI_BASE_URL`    | `https://api.openai.com/v1`                       | Any OpenAI-compatible endpoint (e.g. Groq)       |
| `OPENAI_MODEL`       | `gpt-4o`                                          | Quality tier — used for the main tailoring rewrite |
| `OPENAI_MODEL_FAST`  | `gpt-4o-mini`                                     | Cheap tier — extraction, chat edits, cover letter, email |
| `OPENAI_TIMEOUT`     | `240`                                             | Seconds to wait for a completion                |
| `DB_URL`             | `jdbc:postgresql://localhost:5432/resume_tailor` | JDBC URL                                        |
| `DB_USER`            | `resume`                                          |                                                  |
| `DB_PASSWORD`        | `resume`                                          |                                                  |
| `GOOGLE_CLIENT_ID`   | _(optional)_                                      | Enables Google sign-in if set                   |
| `CORS_ORIGINS`       | `http://localhost:3000,http://localhost:5173`    | Comma-separated                                 |
| `LATEX_ENGINE`       | `tectonic`                                        | `tectonic` or `pdflatex`                        |
| `LATEX_WORKDIR`      | `/tmp/resume-latex`                              | Scratch dir for compilation                     |

In Docker these are wired up in `docker-compose.yml`; you only need `.env`.
The frontend has one build-time variable, `VITE_GOOGLE_CLIENT_ID` (`frontend/.env.local`),
needed only for Google sign-in.

> **Heads up on `/tailor` latency:** it sends the full resume + job requirements in
> one prompt, and quality-tier models can take 1-3 minutes to respond. The
> frontend's nginx proxy (and Vercel's rewrite, in production) allow generous
> timeouts so a slow backend response reaches the browser instead of a generic
> gateway error.

---

## How to use it

1. **Sign in** (optional — Google or skip) and fill in your profile, or skip that too.
2. From the **Home** screen, start a **New tailored resume**.
3. **Pick a saved resume** or upload one (PDF, DOCX, or paste text) — parsed and
   structured once, then reused for every future tailoring run.
4. **Add a job** — paste the description, or give a URL and let it scrape. If you
   already have a strong-fitting tailored resume for something similar, you'll be
   offered it as a free reuse before any AI call runs.
5. Hit **Tailor**. You land in the split-screen workbench: editable resume on the
   left, live PDF on the right, match score, ATS score, and skill gaps up top.
6. **Edit** any tailored section, or use the **Refine** tab to ask for changes in
   plain English. Contact details and education are locked to prevent accidental
   changes. Hit **Save & re-render** to refresh the PDF.
7. **Download** the PDF, or switch tabs to generate a **cover letter** and
   **recruiter email**.
8. From the **Dashboard**: see all your tailored resumes grouped by role, check
   "which resume fits this job?" against a new posting, review your most common
   skill gaps, and click any gap to open a **learning page** with resources to
   close it.

---

## Project structure

```
resume-tailor/
├─ docker-compose.yml        # db + backend + frontend
├─ render.yaml               # Render Blueprint (backend deploy)
├─ DEPLOY.md                 # free-tier deployment walkthrough
├─ .env.example              # copy to .env, add your key
├─ backend/
│  ├─ Dockerfile             # multi-stage build, installs + warms up Tectonic
│  ├─ warmup.tex             # tiny doc compiled at build time to cache Tectonic's bundle
│  ├─ pom.xml
│  └─ src/main/
│     ├─ java/com/resumetailor/
│     │  ├─ config/          # CORS, OpenAI WebClient, properties
│     │  ├─ controller/      # REST endpoints
│     │  ├─ dto/             # request/response records
│     │  ├─ entity/          # JPA entities
│     │  ├─ exception/       # error handling
│     │  ├─ repository/      # Spring Data repos
│     │  ├─ service/         # parsing, OpenAI, LaTeX, PDF, tailoring,
│     │  │                   # MatchAnalyzer, AtsAnalyzer, RoleClassifier
│     │  └─ util/            # content-hashing for dedup
│     └─ resources/
│        ├─ application.yml
│        └─ db/migration/    # Flyway SQL (V1-V6)
└─ frontend/
   ├─ Dockerfile             # build → nginx (local/Docker path)
   ├─ vercel.json            # API rewrite + deploy config (Vercel path)
   ├─ nginx.conf
   └─ src/
      ├─ api/                # axios client
      ├─ components/         # HomePage, DashboardPage, IntakePanel, EditorPane,
      │                      # PreviewPane, ChatPanel, LatexEditorPage,
      │                      # LearningPage, LoginPage, ProfilePage, ...
      ├─ types/
      └─ App.tsx
```

---

## Notes & caveats

- **LLM cost:** each tailor/chat/cover-letter/email call uses tokens. Identical
  resumes and job postings are deduplicated by content hash before ever reaching
  the LLM, and match/ATS scores are computed deterministically — only the actual
  rewrite step needs a model call. Point `OPENAI_BASE_URL` at a free provider
  (e.g. Groq) if you want this to cost nothing.
- **URL scraping:** many job boards (LinkedIn, Workday, etc.) block scraping or
  render via JavaScript. If a URL comes back thin or empty, paste the description
  text instead.
- **Learning page links** are always search-deep-links (YouTube/Coursera/Udemy
  search queries), never a specific guessed video or course URL — fabricating one
  could point at something dead or unrelated.
- **JSON storage:** structured resume/job/tailored data is stored as JSON in
  `text` columns and parsed in the service layer — simple, no `jsonb` querying
  needed.
- **PDF rendering** needs a LaTeX engine. Docker and the deployed backend both
  install and pre-warm Tectonic at build time; for local non-Docker runs, install
  it yourself or PDF steps will fail while everything else still works.
