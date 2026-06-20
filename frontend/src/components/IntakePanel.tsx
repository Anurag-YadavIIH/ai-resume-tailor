import { useEffect, useState } from "react";
import { FileText, Link2, Loader2, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { jobApi, resumeApi, tailorApi, apiError } from "../api";
import type { MasterResume, TailoredResume, TailorReuseSuggestion } from "../types";

interface Props {
  onComplete: (result: TailoredResume) => void;
  profileId?: string;
}

type Tone = "professional" | "concise" | "enthusiastic";

export default function IntakePanel({ onComplete, profileId }: Props) {
  const [savedResumes, setSavedResumes] = useState<MasterResume[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobMode, setJobMode] = useState<"text" | "url">("text");
  const [jobInput, setJobInput] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TailorReuseSuggestion[]>([]);
  const [pendingMasterId, setPendingMasterId] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [openingSuggestionId, setOpeningSuggestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setResumesLoaded(true);
      setShowUpload(true);
      return;
    }
    resumeApi.list(profileId).then(list => {
      setSavedResumes(list);
      if (list.length > 0) {
        setSelectedId(list[0].id); // most recent, default selection
        setShowUpload(false);
      } else {
        setShowUpload(true); // nothing saved yet — upload is the only option
      }
    }).catch(() => {
      setShowUpload(true);
    }).finally(() => setResumesLoaded(true));
  }, [profileId]);

  const canRun =
    (selectedId || (showUpload && (resumeFile || resumeText.trim().length > 40))) &&
    jobInput.trim().length > 20;

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved resume? Any tailored resumes generated from it will also be removed.")) {
      return;
    }
    setDeletingId(id);
    try {
      await resumeApi.remove(id);
      const remaining = savedResumes.filter(r => r.id !== id);
      setSavedResumes(remaining);
      if (selectedId === id) {
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
        } else {
          setSelectedId(null);
          setShowUpload(true); // nothing left to reuse — fall back to upload
        }
      }
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function run() {
    setError("");
    setBusy(true);
    try {
      let masterId = selectedId;
      if (!masterId) {
        setStatus("Reading and structuring your resume…");
        const master = resumeFile
          ? await resumeApi.uploadFile(resumeFile, undefined, profileId)
          : await resumeApi.uploadText(resumeText, undefined, profileId);
        masterId = master.id;
        if (profileId) setSavedResumes(prev => [master, ...prev]);
      }

      setStatus(
        jobMode === "url"
          ? "Fetching the posting and extracting requirements…"
          : "Extracting job requirements…"
      );
      const job = await jobApi.ingest(jobMode, jobInput);

      if (profileId) {
        setStatus("Checking for a strong existing match…");
        const found = await tailorApi.suggestions(profileId, job.id);
        if (found.length > 0) {
          setSuggestions(found);
          setPendingMasterId(masterId);
          setPendingJobId(job.id);
          setBusy(false);
          setStatus("");
          return; // wait for the user to pick reuse vs. fresh tailor
        }
      }

      await finishTailor(masterId, job.id);
    } catch (e) {
      setError(apiError(e));
      setBusy(false);
      setStatus("");
    }
  }

  async function finishTailor(masterId: string, jobId: string) {
    setBusy(true);
    setError("");
    try {
      setStatus("Comparing, finding gaps, and tailoring…");
      const result = await tailorApi.tailor(masterId, jobId, tone, profileId);
      onComplete(result);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function useSuggestion(id: string) {
    setOpeningSuggestionId(id);
    setError("");
    try {
      const tailored = await tailorApi.get(id);
      onComplete(tailored);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setOpeningSuggestionId(null);
    }
  }

  function tailorFreshInstead() {
    if (!pendingMasterId || !pendingJobId) return;
    const masterId = pendingMasterId;
    const jobId = pendingJobId;
    setSuggestions([]);
    setPendingMasterId(null);
    setPendingJobId(null);
    finishTailor(masterId, jobId);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-thread">
          AI resume workbench
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink">
          Tailor your resume to the role,
          <br />
          not the other way around.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Drop in your master resume and a job posting. Tailor rewrites your
          summary, skills, projects, and experience to match — and keeps your
          contact details and education exactly as they are.
        </p>
      </header>

      <div className="grid gap-5">
        {/* Step 1: resume */}
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft font-mono text-xs font-semibold text-brand">
              1
            </span>
            <h2 className="font-display text-lg font-semibold">Master resume</h2>
          </div>

          {!resumesLoaded && (
            <p className="text-sm text-muted">
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> Checking saved resumes…
            </p>
          )}

          {savedResumes.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="label">Which resume should we tailor?</p>
              {savedResumes.map(r => (
                <div
                  key={r.id}
                  onClick={() => { setSelectedId(r.id); setShowUpload(false); }}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition ${
                    selectedId === r.id ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedId === r.id}
                      onChange={() => { setSelectedId(r.id); setShowUpload(false); }}
                      className="shrink-0"
                    />
                    <span className="truncate text-sm text-ink">{r.label}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="shrink-0 text-muted hover:text-bad"
                    title="Delete this saved resume"
                    disabled={deletingId === r.id}
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  >
                    {deletingId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}

              {!showUpload ? (
                <button
                  className="btn-ghost mt-1 text-sm"
                  onClick={() => { setShowUpload(true); setSelectedId(null); }}
                >
                  Upload a different resume instead
                </button>
              ) : (
                <button
                  className="btn-ghost mt-1 text-sm"
                  onClick={() => { setShowUpload(false); setSelectedId(savedResumes[0].id); setResumeFile(null); setResumeText(""); }}
                >
                  Use a saved resume instead
                </button>
              )}
            </div>
          )}

          {showUpload && (
            <>
              {savedResumes.length > 0 && (
                <div className="my-3 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-line" />
                  upload a new one
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}

              <label className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-canvas/40 px-4 py-3 transition hover:border-brand">
                <Upload className="h-5 w-5 text-muted group-hover:text-brand" />
                <span className="text-sm text-muted">
                  {resumeFile ? (
                    <span className="text-ink">{resumeFile.name}</span>
                  ) : (
                    "Upload PDF, DOCX, or TXT"
                  )}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => { setResumeFile(e.target.files?.[0] ?? null); setSelectedId(null); }}
                />
              </label>

              <div className="my-3 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                or paste text
                <span className="h-px flex-1 bg-line" />
              </div>

              <textarea
                className="field min-h-[120px] resize-y font-sans"
                placeholder="Paste your full resume text here…"
                value={resumeText}
                onChange={(e) => { setResumeText(e.target.value); setSelectedId(null); }}
                disabled={!!resumeFile}
              />
            </>
          )}
        </section>

        {/* Step 2: job */}
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft font-mono text-xs font-semibold text-brand">
              2
            </span>
            <h2 className="font-display text-lg font-semibold">
              Job description
            </h2>
          </div>

          <div className="mb-3 inline-flex rounded-lg border border-line p-0.5">
            <button
              onClick={() => setJobMode("text")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                jobMode === "text"
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              <FileText className="h-4 w-4" /> Paste text
            </button>
            <button
              onClick={() => setJobMode("url")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                jobMode === "url"
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Link2 className="h-4 w-4" /> From URL
            </button>
          </div>

          {jobMode === "url" ? (
            <input
              className="field"
              placeholder="https://company.com/careers/senior-engineer"
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
            />
          ) : (
            <textarea
              className="field min-h-[120px] resize-y"
              placeholder="Paste the full job description here…"
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
            />
          )}
          {jobMode === "url" && (
            <p className="mt-2 text-xs text-muted">
              Some sites block scraping. If a URL fails, paste the text instead.
            </p>
          )}
        </section>

        {/* Reuse suggestions — shown instead of the tone/run controls until decided */}
        {suggestions.length > 0 && (
          <section className="card border-brand/40 bg-brand-soft/40 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="font-display text-lg font-semibold">
                You already have a strong match for this
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted">
              These past tailored resumes already cover this job's requirements well — reuse one
              for free, or tailor a brand-new one with AI.
            </p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.tailoredResumeId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {s.originalJobTitle || "Untitled role"}
                      {s.originalCompany ? ` @ ${s.originalCompany}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted">
                      From {s.masterResumeLabel} · {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">
                      {s.matchScoreForNewJob}% match
                    </span>
                    <button
                      className="btn-primary px-3 py-1.5 text-xs"
                      onClick={() => useSuggestion(s.tailoredResumeId)}
                      disabled={openingSuggestionId === s.tailoredResumeId}
                    >
                      {openingSuggestionId === s.tailoredResumeId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Use this
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-ghost mt-3 text-sm" onClick={tailorFreshInstead} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Tailor a new one instead
            </button>
          </section>
        )}

        {/* Tone + run */}
        {suggestions.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="label">Tone</span>
            <div className="inline-flex rounded-lg border border-line p-0.5">
              {(["professional", "concise", "enthusiastic"] as Tone[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                      tone === t
                        ? "bg-brand-soft text-brand"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                )
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            disabled={!canRun || busy}
            onClick={run}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {busy ? "Tailoring…" : "Tailor my resume"}
          </button>
        </div>
        )}

        {status && (
          <p className="text-sm text-muted">
            <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
            {status}
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
