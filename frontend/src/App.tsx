import { useState, useEffect } from "react";
import { Code2, LayoutDashboard, Loader2, RotateCcw, Save, Scissors, ShieldCheck, Target, User } from "lucide-react";
import IntakePanel from "./components/IntakePanel";
import EditorPane from "./components/EditorPane";
import PreviewPane from "./components/PreviewPane";
import MatchScoreRing from "./components/MatchScoreRing";
import MissingSkills from "./components/MissingSkills";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
import LatexEditorPage from "./components/LatexEditorPage";
import DashboardPage from "./components/DashboardPage";
import HomePage from "./components/HomePage";
import LearningPage from "./components/LearningPage";
import { tailorApi, profileApi, apiError, type ChatResult } from "./api";
import type { ResumeContent, TailoredResume, UserProfile } from "./types";

// ─── profile ID: generated once per browser, persisted in localStorage ───────
function getOrCreateProfileId(): string {
  const key = "resume_tailor_profile_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── read from Vite env (set VITE_GOOGLE_CLIENT_ID in frontend/.env.local) ────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type View = "login" | "profile" | "home" | "dashboard" | "intake" | "tailor" | "latex-editor" | "learning";

export default function App() {
  const profileId = getOrCreateProfileId();

  const [view, setView]             = useState<View>("login");
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [tailored, setTailored]     = useState<TailoredResume | null>(null);
  const [content, setContent]       = useState<ResumeContent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dirty, setDirty]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showGaps, setShowGaps]     = useState(false);
  const [error, setError]           = useState("");
  const [learningSkill, setLearningSkill] = useState<string | null>(null);
  const [learningReturnView, setLearningReturnView] = useState<View>("dashboard");

  // On mount: try to load an existing profile to skip login/profile pages
  useEffect(() => {
    profileApi.get(profileId).then(p => {
      if (p.fullName) {
        setProfile(p);
        setView("home");
      }
      // else stay on login — profile exists in DB but has no data yet
    }).catch(() => {
      // no profile yet — stay on login
    });
  }, [profileId]);

  // ─── handlers ───────────────────────────────────────────────────────────────

  function onLoginComplete(p: UserProfile) {
    setProfile(p);
    setView("profile");
  }

  function onLoginSkip() {
    setView("profile");
  }

  function onProfileSave(p: UserProfile) {
    setProfile(p);
    setView("home");
  }

  function onProfileSkip() {
    setView("home");
  }

  function start(result: TailoredResume) {
    setTailored(result);
    setContent(result.content);
    setRefreshKey(k => k + 1);
    setView("tailor");
  }

  function openFromDashboard(result: TailoredResume) {
    setTailored(result);
    setContent(result.content);
    setRefreshKey(k => k + 1);
    setDirty(false);
    setError("");
    setView("tailor");
  }

  function reset() {
    setTailored(null);
    setContent(null);
    setDirty(false);
    setError("");
    setView("dashboard");
  }

  async function save() {
    if (!tailored || !content) return;
    setSaving(true);
    setError("");
    try {
      const updated = await tailorApi.updateContent(tailored.id, content);
      setTailored({ ...tailored, ...updated });
      setDirty(false);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  function onChatResult(result: ChatResult) {
    if (!tailored) return;
    setContent(result.content);
    setTailored({
      ...tailored,
      content: result.content,
      latexSource: result.latexSource,
      chatHistory: result.chatHistory,
    });
    setDirty(false);
    setRefreshKey(k => k + 1);
  }

  function onLatexSaved(updated: TailoredResume) {
    setTailored(updated);
    setRefreshKey(k => k + 1);
  }

  function learnSkill(skill: string) {
    setLearningReturnView(view);
    setLearningSkill(skill);
    setView("learning");
  }

  // ─── views ──────────────────────────────────────────────────────────────────

  if (view === "login") {
    return (
      <LoginPage
        profileId={profileId}
        googleClientId={GOOGLE_CLIENT_ID}
        onComplete={onLoginComplete}
        onSkip={onLoginSkip}
      />
    );
  }

  if (view === "profile") {
    return (
      <ProfilePage
        profileId={profileId}
        initial={profile}
        onSave={onProfileSave}
        onSkip={onProfileSkip}
      />
    );
  }

  if (view === "latex-editor" && tailored) {
    return (
      <LatexEditorPage
        tailored={tailored}
        onBack={() => setView("tailor")}
        onSaved={onLatexSaved}
      />
    );
  }

  if (view === "home") {
    return (
      <HomePage
        profile={profile}
        onGoDashboard={() => setView("dashboard")}
        onNewTailor={() => setView("intake")}
        onEditProfile={() => setView("profile")}
      />
    );
  }

  if (view === "dashboard") {
    return (
      <div className="min-h-screen">
        <DashboardPage
          profileId={profileId}
          profile={profile}
          onGoHome={() => setView("home")}
          onNewTailor={() => setView("intake")}
          onOpenResume={openFromDashboard}
          onEditProfile={() => setView("profile")}
          onLearnSkill={learnSkill}
        />
      </div>
    );
  }

  if (view === "learning" && learningSkill) {
    return (
      <div className="min-h-screen">
        <LearningPage skill={learningSkill} onBack={() => setView(learningReturnView)} />
      </div>
    );
  }

  if (view === "intake" || !tailored || !content) {
    return (
      <div className="min-h-screen">
        <IntakePanel
          onComplete={start}
          profileId={profileId}
        />
      </div>
    );
  }

  // ─── main tailor view ───────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col">
      {/* App bar */}
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">Tailor</span>
        </div>

        <div className="ml-2 hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-ink">Tailored resume</p>
          <p className="truncate text-xs text-muted">
            Contact & education preserved · {content.skills.length} skills
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Back to dashboard */}
          <button
            className="btn-ghost px-3 py-2 text-sm"
            onClick={() => setView("dashboard")}
            title="Back to dashboard"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>

          {/* LaTeX editor button */}
          <button
            className="btn-ghost px-3 py-2 text-sm"
            onClick={() => setView("latex-editor")}
            title="Open Overleaf-style LaTeX editor"
          >
            <Code2 className="h-4 w-4" /> Edit LaTeX
          </button>

          {/* Gap analysis */}
          <div className="relative">
            <button
              onClick={() => setShowGaps(s => !s)}
              className="btn-ghost px-3 py-2 text-sm"
            >
              <Target className="h-4 w-4 text-thread" />
              {tailored.missingSkills?.length ?? 0} gaps
            </button>
            {showGaps && (
              <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-line bg-surface p-4 shadow-lift">
                <h3 className="mb-3 font-display font-semibold">Gap analysis</h3>
                <MissingSkills skills={tailored.missingSkills} onLearnSkill={learnSkill} />
              </div>
            )}
          </div>

          {tailored.atsScore != null && (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                tailored.atsScore >= 70
                  ? "bg-ok/10 text-ok"
                  : tailored.atsScore >= 40
                    ? "bg-warn/10 text-warn"
                    : "bg-bad/10 text-bad"
              }`}
              title="ATS-readiness heuristic: contact completeness, summary length, skill count, quantified bullets, bullet density, education section"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {tailored.atsScore}% ATS
            </span>
          )}

          <MatchScoreRing score={tailored.matchScore} size={56} />

          <button
            className="btn-primary"
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dirty ? "Save & re-render" : "Saved"}
          </button>

          <button className="btn-ghost" onClick={() => setView("profile")} title="Edit profile">
            <User className="h-4 w-4" />
          </button>

          <button className="btn-ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Start over
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-bad/30 bg-bad/5 px-4 py-2 text-sm text-bad">{error}</div>
      )}

      {/* Split-screen workbench */}
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 border-r border-line bg-surface">
          <EditorPane
            tailored={tailored}
            content={content}
            onContentChange={c => { setContent(c); setDirty(true); }}
            onCoverLetter={text => setTailored({ ...tailored, coverLetter: text })}
            onRecruiterEmail={text => setTailored({ ...tailored, recruiterEmail: text })}
            onChatResult={onChatResult}
          />
        </div>
        <div className="min-h-0">
          <PreviewPane tailoredId={tailored.id} refreshKey={refreshKey} rendering={saving} />
        </div>
      </main>
    </div>
  );
}
