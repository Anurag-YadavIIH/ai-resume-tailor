# Deploying Resume Tailor for free

Three free services, zero code changes needed (everything below is already wired
through environment variables): **Neon** (Postgres), **Render** (backend + LaTeX
compiler), **Vercel** (frontend), with **Groq** as a free OpenAI-compatible LLM
provider in place of paid OpenAI.

Tradeoff to know up front: Render's free web service spins down after ~15 minutes
of no traffic and takes 30-60s to wake back up on the next request. Fine for a
personal/demo deployment; annoying if you want it always-instantly-on (the paid
tier removes this).

## 0. Push this repo to GitHub

Render and Vercel both deploy by connecting to a Git repo. This project isn't a
git repo yet — create one and push it (make it private if you don't want the
code public; deployment doesn't require a public repo):

```bash
git init
git add .
git commit -m "Initial commit"
# create a repo on GitHub, then:
git remote add origin <your-repo-url>
git push -u origin main
```

## 1. Database — Neon (free Postgres)

1. Sign up at neon.tech, create a project.
2. Copy the connection string it gives you. Split it into:
   - `DB_URL` = `jdbc:postgresql://<host>/<dbname>?sslmode=require`
   - `DB_USER` = the username Neon gives you
   - `DB_PASSWORD` = the password Neon gives you
3. Flyway will create all tables automatically on first backend boot — no manual
   schema setup needed.

## 2. LLM — Groq (free, OpenAI-compatible)

1. Sign up at console.groq.com, create an API key.
2. You'll set these on the backend (already the default in `render.yaml`):
   - `OPENAI_API_KEY` = your Groq key
   - `OPENAI_BASE_URL` = `https://api.groq.com/openai/v1`
   - `OPENAI_MODEL` = `llama-3.3-70b-versatile` (quality tier)
   - `OPENAI_MODEL_FAST` = `llama-3.1-8b-instant` (cheap/fast tier)
3. Both models support Groq's JSON mode, which this app relies on for every
   structured response. If you ever swap to a different Groq model, confirm it
   supports `response_format: json_object` first.
4. Free tier has rate limits (requests/tokens per minute) — fine for personal use,
   may throttle under real traffic. Swap `OPENAI_BASE_URL`/`OPENAI_API_KEY` back to
   OpenAI's anytime; no code change needed either way.

## 3. Backend — Render

1. Sign up at render.com, "New" → "Blueprint", point it at your GitHub repo.
   Render will read `render.yaml` at the repo root and create the service.
2. In the service's Environment tab, fill in the variables marked `sync: false`
   in `render.yaml`:
   - `DB_URL`, `DB_USER`, `DB_PASSWORD` (from step 1)
   - `OPENAI_API_KEY` (from step 2)
   - `GOOGLE_CLIENT_ID` (your existing Google OAuth client ID, if using login)
   - `CORS_ORIGINS` — set to your Vercel URL once you have it (step 4), e.g.
     `https://resume-tailor.vercel.app`
3. Deploy. First build takes a few minutes (Maven build + installing tectonic).
   Note the service URL Render gives you, e.g. `https://resume-tailor-backend.onrender.com`
   — you need it for the next step.

## 4. Frontend — Vercel

1. Edit `frontend/vercel.json` and replace `YOUR-BACKEND-URL.onrender.com` with
   your actual Render backend URL from step 3.
2. Commit and push that change.
3. Sign up at vercel.com, "Add New" → "Project", import your repo, set the
   **Root Directory** to `frontend`. Vercel auto-detects Vite.
4. Deploy. Vercel will give you a URL like `https://resume-tailor.vercel.app`.
5. Go back to Render and set `CORS_ORIGINS` to that URL (step 3.2) — though since
   `vercel.json` proxies `/api/*` server-side to Render, the browser never makes a
   true cross-origin request, so CORS mostly acts as a safety net here, not a hard
   requirement.

## 5. Google OAuth (only if you're using login)

In Google Cloud Console → your OAuth client → "Authorized JavaScript origins",
add your Vercel URL (e.g. `https://resume-tailor.vercel.app`). Google login will
403 until you do this — it whitelists which origins may use the client ID.

## Verifying it works

- Visit your Vercel URL. First load may be slow if Render's free instance had
  spun down — that's expected.
- Try uploading a resume and tailoring against a job description end-to-end.
- If `/api/...` calls fail, check the Render service logs first (cold start,
  missing env var, or DB connection issue are the usual causes).
