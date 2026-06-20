import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Briefcase,
  FileText,
  GitCompareArrows,
  Home,
  Lightbulb,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Wand2,
} from "lucide-react";
import { tailorApi, resumeApi, apiError } from "../api";
import type {
  CompareResult,
  MasterResume,
  TailorMatchResult,
  TailoredResume,
  TailoredResumeSummary,
  UserProfile,
} from "../types";
import MatchScoreRing from "./MatchScoreRing";

interface Props {
  profileId: string;
  profile: UserProfile | null;
  onGoHome: () => void;
  onNewTailor: () => void;
  onOpenResume: (tailored: TailoredResume) => void;
  onEditProfile: () => void;
  onLearnSkill: (skill: string) => void;
}

type SortMode = "recent" | "score";

export default function DashboardPage({
  profileId,
  profile,
  onGoHome,
  onNewTailor,
  onOpenResume,
  onEditProfile,
  onLearnSkill,
}: Props) {
  const [items, setItems] = useState<TailoredResumeSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("recent");
  const [compareOpenId, setCompareOpenId] = useState<string | null>(null);

  const [resumes, setResumes] = useState<MasterResume[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);

  const [matchText, setMatchText] = useState("");
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchResults, setMatchResults] = useState<TailorMatchResult[] | null>(null);

  useEffect(() => {
    tailorApi
      .list(profileId)
      .then(setItems)
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoaded(true));
    resumeApi
      .list(profileId)
      .then(setResumes)
      .finally(() => setResumesLoaded(true));
  }, [profileId]);

  const stats = useMemo(() => {
    const total = items.length;
    const avgScore = total
      ? Math.round(items.reduce((sum, i) => sum + (i.matchScore ?? 0), 0) / total)
      : 0;
    const avgAts = total
      ? Math.round(items.reduce((sum, i) => sum + (i.atsScore ?? 0), 0) / total)
      : 0;
    const totalGaps = items.reduce((sum, i) => sum + i.missingSkills.length, 0);
    const companies = new Set(items.map((i) => i.company).filter(Boolean)).size;
    return { total, avgScore, avgAts, totalGaps, companies };
  }, [items]);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "score") {
      copy.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return copy;
  }, [items, sort]);

  const topGaps = useMemo(() => {
    const bySkill = new Map<string, { count: number; mentions: number; severity: string; suggestion: string }>();
    for (const item of items) {
      for (const gap of item.missingSkills) {
        const existing = bySkill.get(gap.skill);
        if (existing) {
          existing.count += 1;
          existing.mentions += gap.mentions ?? 0;
        } else {
          bySkill.set(gap.skill, { count: 1, mentions: gap.mentions ?? 0, severity: gap.severity, suggestion: gap.suggestion });
        }
      }
    }
    // Skills that recur across many resumes AND are repeated heavily within job postings rank highest.
    return [...bySkill.entries()]
      .map(([skill, v]) => ({ skill, ...v }))
      .sort((a, b) => (b.count - a.count) * 10 + (b.mentions - a.mentions))
      .slice(0, 6);
  }, [items]);

  const roleGroups = useMemo(() => {
    const groups = new Map<string, TailoredResumeSummary[]>();
    for (const item of sorted) {
      const key = item.roleCategory || "Other";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [sorted]);

  const insights = useMemo(() => {
    if (items.length < 2) return [];
    const out: string[] = [];

    const roleCounts = new Map<string, number>();
    items.forEach((i) => roleCounts.set(i.roleCategory, (roleCounts.get(i.roleCategory) ?? 0) + 1));
    const topRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topRole && topRole[1] >= 2) {
      out.push(
        `You're mostly targeting ${topRole[0]} roles (${topRole[1]} of ${items.length} tailored resumes). Consider deepening your master resume's evidence for this track.`
      );
    }

    const byDate = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const mid = Math.floor(byDate.length / 2);
    const earlierAvg =
      byDate.slice(0, mid).reduce((s, i) => s + (i.matchScore ?? 0), 0) / Math.max(1, mid);
    const laterAvg =
      byDate.slice(mid).reduce((s, i) => s + (i.matchScore ?? 0), 0) / Math.max(1, byDate.length - mid);
    if (byDate.length >= 4) {
      const delta = Math.round(laterAvg - earlierAvg);
      if (delta >= 5) {
        out.push(`Your match scores are trending up (+${delta} pts recently) — your resume is getting sharper.`);
      } else if (delta <= -5) {
        out.push(`Your match scores dipped recently (${delta} pts) — you may be applying to a less familiar role type or tougher postings.`);
      }
    }

    if (topGaps.length > 0) {
      out.push(
        `"${topGaps[0].skill}" is your most common gap, showing up in ${topGaps[0].count} tailored resume${topGaps[0].count === 1 ? "" : "s"}. Closing it would likely raise several of your match scores at once.`
      );
    }

    const lowAts = items.filter((i) => (i.atsScore ?? 100) < 60).length;
    if (lowAts > 0) {
      out.push(
        `${lowAts} of your tailored resumes score under 60% on ATS-readiness — usually missing quantified bullets or a short skills list. Open them and check the ATS badge for specifics.`
      );
    }

    return out;
  }, [items, topGaps]);

  async function handleDeleteResume(id: string) {
    if (
      !window.confirm(
        "Delete this saved resume? Any tailored resumes generated from it will also be removed."
      )
    )
      return;
    setDeletingResumeId(id);
    try {
      await resumeApi.remove(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      // Cascades server-side — refetch since any tailored resumes derived from it are now gone.
      const refreshed = await tailorApi.list(profileId);
      setItems(refreshed);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeletingResumeId(null);
    }
  }

  async function handleOpen(id: string) {
    setOpeningId(id);
    setError("");
    try {
      const tailored = await tailorApi.get(id);
      onOpenResume(tailored);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this tailored resume? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    try {
      await tailorApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function runMatchCheck() {
    if (matchText.trim().length < 20) return;
    setMatchBusy(true);
    setMatchError("");
    setMatchResults(null);
    try {
      const results = await tailorApi.matchAcrossResumes(profileId, "text", matchText);
      setMatchResults(results);
    } catch (e) {
      setMatchError(apiError(e));
    } finally {
      setMatchBusy(false);
    }
  }

  async function openMatch(id: string) {
    setOpeningId(id);
    try {
      const tailored = await tailorApi.get(id);
      onOpenResume(tailored);
    } catch (e) {
      setMatchError(apiError(e));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-thread">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-muted">
            Everything you've tailored, at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={onGoHome} title="Back to home">
            <Home className="h-4 w-4" /> Home
          </button>
          <button className="btn-ghost" onClick={onEditProfile} title="Edit profile">
            <User className="h-4 w-4" /> Profile
          </button>
          <button className="btn-primary" onClick={onNewTailor}>
            <Plus className="h-4 w-4" /> New tailored resume
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Tailored resumes" value={stats.total} />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg. match score"
          value={`${stats.avgScore}%`}
          accent={stats.avgScore >= 70 ? "ok" : stats.avgScore >= 40 ? "warn" : "bad"}
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Avg. ATS score"
          value={`${stats.avgAts}%`}
          accent={stats.avgAts >= 70 ? "ok" : stats.avgAts >= 40 ? "warn" : "bad"}
        />
        <StatCard icon={<Target className="h-4 w-4" />} label="Open skill gaps" value={stats.totalGaps} />
        <StatCard icon={<Briefcase className="h-4 w-4" />} label="Companies targeted" value={stats.companies} />
      </div>

      {/* Check a job description against every tailored resume you already have */}
      <section className="mb-8 card p-5">
        <div className="mb-3 flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-brand" />
          <h2 className="font-display text-lg font-semibold">Which of my resumes fits this job?</h2>
        </div>
        <p className="mb-4 text-sm text-muted">
          Paste a job description to score every tailored resume you have against it — no AI call.
        </p>
        <textarea
          className="field min-h-[90px] resize-y text-sm"
          placeholder="Paste a job description here…"
          value={matchText}
          onChange={(e) => setMatchText(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            className="btn-primary px-3 py-1.5 text-sm"
            onClick={runMatchCheck}
            disabled={matchBusy || matchText.trim().length < 20}
          >
            {matchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
            Check compatibility
          </button>
        </div>

        {matchError && <p className="mt-2 text-sm text-bad">{matchError}</p>}

        {matchResults && (
          <div className="mt-4 space-y-2">
            {matchResults.length === 0 ? (
              <p className="text-sm text-muted">You don't have any tailored resumes yet.</p>
            ) : (
              <>
                {(matchResults[0]?.matchScore ?? 0) < 50 && (
                  <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
                    <span className="text-warn">
                      None of your existing resumes are a strong fit (best is {matchResults[0]?.matchScore ?? 0}%).
                    </span>
                    <button className="btn-primary px-3 py-1.5 text-xs" onClick={onNewTailor}>
                      <Wand2 className="h-3.5 w-3.5" /> Tailor a new one
                    </button>
                  </div>
                )}
                {matchResults.slice(0, 6).map((r) => (
                  <div
                    key={r.tailoredResumeId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MatchScoreRing score={r.matchScore} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {r.originalJobTitle || "Untitled role"}
                          {r.originalCompany ? ` @ ${r.originalCompany}` : ""}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {r.roleCategory} · from {r.masterResumeLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                      onClick={() => openMatch(r.tailoredResumeId)}
                      disabled={openingId === r.tailoredResumeId}
                    >
                      {openingId === r.tailoredResumeId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Open
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* Deterministic, rule-based insights from your own tailoring history */}
      {insights.length > 0 && (
        <section className="mb-8 card border-brand/30 bg-brand-soft/30 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-brand" />
            <h2 className="font-display text-lg font-semibold">Insights from your job search</h2>
          </div>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {insight}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Saved resumes you can manage */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">
            {resumesLoaded ? `${resumes.length} saved resume${resumes.length === 1 ? "" : "s"}` : "Saved resumes"}
          </span>
          <button className="btn-ghost text-sm" onClick={onNewTailor}>
            <Upload className="h-3.5 w-3.5" /> Upload another
          </button>
        </div>
        {!resumesLoaded ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading saved resumes…
          </p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-muted">No resumes uploaded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <FileText className="h-3.5 w-3.5 text-muted" />
                <span className="text-ink">{r.label}</span>
                <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                <button
                  className="text-muted hover:text-bad"
                  title="Delete this saved resume"
                  onClick={() => handleDeleteResume(r.id)}
                  disabled={deletingResumeId === r.id}
                >
                  {deletingResumeId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Aggregated skill gaps with what-to-do-about-it suggestions */}
      {topGaps.length > 0 && (
        <section className="mb-8 card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-bad" />
            <h2 className="font-display text-lg font-semibold">Your most common skill gaps</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Skills that keep showing up as missing across your tailored resumes — here's what to do about each.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {topGaps.map((gap) => (
              <button
                key={gap.skill}
                onClick={() => onLearnSkill(gap.skill)}
                className="rounded-lg border border-line bg-canvas/40 p-3 text-left transition hover:border-brand hover:bg-brand-soft"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{gap.skill}</span>
                  <span className="shrink-0 rounded-full bg-bad/10 px-2 py-0.5 text-xs text-bad">
                    {gap.count}x
                  </span>
                </div>
                <p className="text-xs text-muted">{gap.suggestion}</p>
                <p className="mt-1 text-xs font-medium text-brand">Learn this →</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}

      {!loaded && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your tailored resumes…
        </p>
      )}

      {loaded && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-canvas/40 px-8 py-14 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-thread" />
          <p className="mb-1 font-display text-lg font-semibold text-ink">No tailored resumes yet</p>
          <p className="mb-5 text-sm text-muted">
            Pick a saved resume and a job description to generate your first one.
          </p>
          <button className="btn-primary" onClick={onNewTailor}>
            <Plus className="h-4 w-4" /> Start tailoring
          </button>
        </div>
      )}

      {loaded && items.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="label">{items.length} tailored resume{items.length === 1 ? "" : "s"}</span>
            <div className="inline-flex rounded-lg border border-line p-0.5 text-sm">
              <button
                onClick={() => setSort("recent")}
                className={`rounded-md px-3 py-1 transition ${sort === "recent" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                Most recent
              </button>
              <button
                onClick={() => setSort("score")}
                className={`rounded-md px-3 py-1 transition ${sort === "score" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                Highest match
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {roleGroups.map(([role, roleItems]) => (
              <div key={role}>
                <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
                  {role}
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-muted">
                    {roleItems.length}
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roleItems.map((item) => (
                    <div
                      key={item.id}
                      className="group card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display font-semibold text-ink">
                            {item.jobTitle || "Untitled role"}
                          </p>
                          <p className="truncate text-sm text-muted">{item.company || "—"}</p>
                        </div>
                        <MatchScoreRing score={item.matchScore ?? 0} size={48} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="truncate">From {item.masterResumeLabel}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.atsScore != null && (
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                              item.atsScore >= 70
                                ? "bg-ok/10 text-ok"
                                : item.atsScore >= 40
                                  ? "bg-warn/10 text-warn"
                                  : "bg-bad/10 text-bad"
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" /> {item.atsScore}% ATS
                          </span>
                        )}
                        {item.missingSkills.length > 0 && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-bad/10 px-2 py-0.5 text-xs text-bad">
                            <Target className="h-3 w-3" /> {item.missingSkills.length} gap{item.missingSkills.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto flex items-center gap-2 pt-1 opacity-90 transition group-hover:opacity-100">
                        <button
                          className="btn-primary flex-1 px-3 py-1.5 text-xs"
                          onClick={() => handleOpen(item.id)}
                          disabled={openingId === item.id}
                        >
                          {openingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Open
                        </button>
                        <button
                          className={`px-2 py-1.5 text-xs ${compareOpenId === item.id ? "btn-primary" : "btn-ghost"}`}
                          title="Compare against a different job description"
                          onClick={() => setCompareOpenId(compareOpenId === item.id ? null : item.id)}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="btn-ghost px-2 py-1.5 text-muted hover:text-bad"
                          title="Delete"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {compareOpenId === item.id && (
                        <CompareWidget tailoredResumeId={item.id} onLearnSkill={onLearnSkill} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompareWidget({
  tailoredResumeId,
  onLearnSkill,
}: {
  tailoredResumeId: string;
  onLearnSkill: (skill: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);

  async function run() {
    if (text.trim().length < 20) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await tailorApi.compare(tailoredResumeId, "text", text);
      setResult(r);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="-mx-1 mt-1 rounded-lg border border-line bg-canvas/40 p-3" onClick={(e) => e.stopPropagation()}>
      <p className="mb-2 text-xs font-medium text-muted">
        Paste a job description to see how this resume scores against it (no AI call, no changes saved).
      </p>
      <textarea
        className="field min-h-[70px] resize-y text-xs"
        placeholder="Paste job description text…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          className="btn-primary px-3 py-1.5 text-xs"
          onClick={run}
          disabled={busy || text.trim().length < 20}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Check match
        </button>
        {result && (
          <span className="text-xs text-muted">
            {result.jobTitle || "This job"}
            {result.company ? ` @ ${result.company}` : ""}
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-bad">{error}</p>}

      {result && (
        <div className="mt-3 flex items-start gap-3">
          <MatchScoreRing score={result.matchScore} size={44} />
          <div className="min-w-0 flex-1">
            {result.missingSkills.length === 0 ? (
              <p className="text-xs text-ok">No gaps found — full coverage.</p>
            ) : (
              <ul className="space-y-0.5">
                {result.missingSkills.slice(0, 5).map((s, i) => (
                  <li key={i} className="truncate text-xs text-muted">
                    <button className="font-medium text-bad hover:underline" onClick={() => onLearnSkill(s.skill)}>
                      {s.skill}
                    </button>{" "}
                    — {s.suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: "ok" | "warn" | "bad";
}) {
  const valueColor =
    accent === "ok" ? "text-ok" : accent === "warn" ? "text-warn" : accent === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="card flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {icon} {label}
      </span>
      <span className={`font-display text-2xl font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}
