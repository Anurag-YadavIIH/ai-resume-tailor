import { useState, type ReactNode } from "react";
import { Copy, Loader2, Lock, Mail, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import type { ResumeContent, TailoredResume } from "../types";
import { documentApi, apiError, type ChatResult } from "../api";
import ChatPanel from "./ChatPanel";

interface Props {
  tailored: TailoredResume;
  content: ResumeContent;
  onContentChange: (c: ResumeContent) => void;
  onCoverLetter: (text: string) => void;
  onRecruiterEmail: (text: string) => void;
  onChatResult: (result: ChatResult) => void;
}

type Tab = "resume" | "refine" | "cover" | "email";

export default function EditorPane({
  tailored,
  content,
  onContentChange,
  onCoverLetter,
  onRecruiterEmail,
  onChatResult,
}: Props) {
  const [tab, setTab] = useState<Tab>("resume");

  const set = (patch: Partial<ResumeContent>) =>
    onContentChange({ ...content, ...patch });

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-line px-4 pt-3">
        <TabButton active={tab === "resume"} onClick={() => setTab("resume")} icon={<ScrollText className="h-4 w-4" />}>
          Resume
        </TabButton>
        <TabButton active={tab === "refine"} onClick={() => setTab("refine")} icon={<Sparkles className="h-4 w-4" />}>
          Refine
        </TabButton>
        <TabButton active={tab === "cover"} onClick={() => setTab("cover")} icon={<ScrollText className="h-4 w-4" />}>
          Cover letter
        </TabButton>
        <TabButton active={tab === "email"} onClick={() => setTab("email")} icon={<Mail className="h-4 w-4" />}>
          Recruiter email
        </TabButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {tab === "refine" && (
          <ChatPanel
            tailoredId={tailored.id}
            content={content}
            chatHistory={tailored.chatHistory ?? []}
            onResult={onChatResult}
          />
        )}

        {tab === "resume" && (
          <div className="space-y-6">
            <PreservedBlock content={content} />

            <Section title="Summary">
              <textarea
                className="field min-h-[90px] resize-y"
                value={content.summary}
                onChange={(e) => set({ summary: e.target.value })}
              />
            </Section>

            <Section title="Skills" hint="Comma-separated, most relevant first">
              <input
                className="field"
                value={content.skills.join(", ")}
                onChange={(e) =>
                  set({
                    skills: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Section>

            <Section title="Experience">
              <div className="space-y-4">
                {content.experience.map((job, i) => (
                  <div key={i} className="rounded-lg border border-line p-3">
                    <div className="mb-2 flex items-baseline justify-between">
                      <p className="font-medium text-ink">
                        {job.role}{" "}
                        <span className="text-muted">· {job.company}</span>
                      </p>
                      <span className="font-mono text-xs text-muted">
                        {job.start} – {job.end}
                      </span>
                    </div>
                    <textarea
                      className="field min-h-[90px] resize-y text-sm"
                      value={job.bullets.join("\n")}
                      onChange={(e) => {
                        const experience = [...content.experience];
                        experience[i] = {
                          ...job,
                          bullets: e.target.value.split("\n").filter(Boolean),
                        };
                        set({ experience });
                      }}
                    />
                  </div>
                ))}
              </div>
            </Section>

            {content.projects?.length > 0 && (
              <Section title="Projects">
                <div className="space-y-4">
                  {content.projects.map((p, i) => (
                    <div key={i} className="rounded-lg border border-line p-3">
                      <p className="mb-2 font-medium text-ink">{p.name}</p>
                      <textarea
                        className="field min-h-[70px] resize-y text-sm"
                        value={p.bullets.join("\n")}
                        onChange={(e) => {
                          const projects = [...content.projects];
                          projects[i] = {
                            ...p,
                            bullets: e.target.value.split("\n").filter(Boolean),
                          };
                          set({ projects });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "cover" && (
          <DocPanel
            value={tailored.coverLetter}
            empty="Generate a tailored cover letter grounded in this resume."
            generateLabel="Generate cover letter"
            onGenerate={() => documentApi.coverLetter(tailored.id)}
            onResult={onCoverLetter}
          />
        )}

        {tab === "email" && (
          <DocPanel
            value={tailored.recruiterEmail}
            empty="Generate a short, high-signal email to a recruiter."
            generateLabel="Generate recruiter email"
            onGenerate={() => documentApi.recruiterEmail(tailored.id)}
            onResult={onRecruiterEmail}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-x border-t border-line bg-surface text-ink"
          : "text-muted hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="label">{title}</h3>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function PreservedBlock({ content }: { content: ResumeContent }) {
  return (
    <section className="rounded-lg border border-line bg-canvas/50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-muted" />
        <span className="label">Preserved — contact & education</span>
      </div>
      <p className="text-sm font-medium text-ink">{content.contact.name}</p>
      <p className="text-xs text-muted">
        {[content.contact.email, content.contact.phone, content.contact.location]
          .filter(Boolean)
          .join("  ·  ")}
      </p>
      {content.education?.map((ed, i) => (
        <p key={i} className="mt-1 text-xs text-muted">
          {ed.degree} {ed.field && `in ${ed.field}`} — {ed.institution}
        </p>
      ))}
    </section>
  );
}

function DocPanel({
  value,
  empty,
  generateLabel,
  onGenerate,
  onResult,
}: {
  value: string | null;
  empty: string;
  generateLabel: string;
  onGenerate: () => Promise<string>;
  onResult: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    try {
      onResult(await onGenerate());
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={run} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {value ? "Regenerate" : generateLabel}
        </button>
        {value && (
          <button className="btn-ghost" onClick={copy}>
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {error && (
        <div className="rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}
      {value ? (
        <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-4 font-sans text-sm leading-relaxed text-ink">
          {value}
        </pre>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {empty}
        </p>
      )}
    </div>
  );
}
