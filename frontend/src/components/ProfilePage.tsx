import { useState, type ReactNode } from "react";
import { Loader2, Plus, Save, Scissors, Trash2 } from "lucide-react";
import type { Certification, EducationItem, UserProfile } from "../types";
import { profileApi, apiError } from "../api";

interface Props {
  profileId: string;
  initial: UserProfile | null;
  onSave: (profile: UserProfile) => void;
  onSkip: () => void;
}

const emptyEdu = (): EducationItem => ({ institution: "", degree: "", field: "", start: "", end: "", details: "" });
const emptyCert = (): Certification => ({ name: "", issuer: "", year: "" });

export default function ProfilePage({ profileId, initial, onSave, onSkip }: Props) {
  const [fullName, setFullName]       = useState(initial?.fullName ?? "");
  const [email, setEmail]             = useState(initial?.email ?? "");
  const [phone, setPhone]             = useState(initial?.phone ?? "");
  const [location, setLocation]       = useState(initial?.location ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl]     = useState(initial?.githubUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "");
  const [skillsText, setSkillsText]   = useState((initial?.skills ?? []).join(", "));
  const [education, setEducation]     = useState<EducationItem[]>(initial?.education?.length ? initial.education : [emptyEdu()]);
  const [certs, setCerts]             = useState<Certification[]>(initial?.certifications?.length ? initial.certifications : []);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  async function handleSave() {
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const skills = skillsText.split(",").map(s => s.trim()).filter(Boolean);
      const saved = await profileApi.save(profileId, {
        fullName, email, phone, location,
        linkedinUrl, githubUrl, portfolioUrl,
        skills,
        certifications: certs.filter(c => c.name.trim()),
        education: education.filter(e => e.institution.trim()),
      });
      onSave(saved);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  function updateEdu(i: number, patch: Partial<EducationItem>) {
    const next = [...education];
    next[i] = { ...next[i], ...patch };
    setEducation(next);
  }

  function updateCert(i: number, patch: Partial<Certification>) {
    const next = [...certs];
    next[i] = { ...next[i], ...patch };
    setCerts(next);
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">Tailor</span>
          <span className="ml-2 text-sm text-muted">/ Your Profile</span>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onSkip}>Skip for now</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        {error && (
          <div className="rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">{error}</div>
        )}

        <p className="text-sm text-muted"><span className="text-bad">*</span> Required</p>

        {/* Personal Info */}
        <FormSection title="Personal information" description="Appears at the top of every generated resume.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label mb-1 block">Full name <span className="text-bad">*</span></label>
              <input className="field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label mb-1 block">Email <span className="text-bad">*</span></label>
              <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label mb-1 block">Phone</label>
              <input className="field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div className="col-span-2">
              <label className="label mb-1 block">Location</label>
              <input className="field" value={location} onChange={e => setLocation(e.target.value)} placeholder="San Francisco, CA" />
            </div>
          </div>
        </FormSection>

        {/* Links */}
        <FormSection title="Links" description="Shown in the contact line at the top of the resume.">
          <div className="space-y-3">
            <div>
              <label className="label mb-1 block">LinkedIn URL</label>
              <input className="field" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
            </div>
            <div>
              <label className="label mb-1 block">GitHub URL</label>
              <input className="field" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
            </div>
            <div>
              <label className="label mb-1 block">Portfolio / Website <span className="text-muted">(optional)</span></label>
              <input className="field" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>
        </FormSection>

        {/* Skills */}
        <FormSection title="Skills" description="Comma-separated. The AI uses these as the base skill pool when tailoring.">
          <textarea
            className="field min-h-[80px] resize-y"
            value={skillsText}
            onChange={e => setSkillsText(e.target.value)}
            placeholder="Python, PyTorch, TensorFlow, SQL, Docker, Git, AWS…"
          />
        </FormSection>

        {/* Education */}
        <FormSection title="Education" description="Added to the bottom of every generated resume.">
          <div className="space-y-4">
            {education.map((ed, i) => (
              <div key={i} className="relative rounded-lg border border-line p-4">
                <button
                  className="absolute right-3 top-3 text-muted hover:text-bad"
                  onClick={() => setEducation(education.filter((_, j) => j !== i))}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label mb-1 block">Institution</label>
                    <input className="field" value={ed.institution} onChange={e => updateEdu(i, { institution: e.target.value })} placeholder="MIT" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Degree</label>
                    <input className="field" value={ed.degree} onChange={e => updateEdu(i, { degree: e.target.value })} placeholder="B.S." />
                  </div>
                  <div>
                    <label className="label mb-1 block">Field</label>
                    <input className="field" value={ed.field} onChange={e => updateEdu(i, { field: e.target.value })} placeholder="Computer Science" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Start year</label>
                    <input className="field" value={ed.start} onChange={e => updateEdu(i, { start: e.target.value })} placeholder="2018" />
                  </div>
                  <div>
                    <label className="label mb-1 block">End year</label>
                    <input className="field" value={ed.end} onChange={e => updateEdu(i, { end: e.target.value })} placeholder="2022" />
                  </div>
                  <div className="col-span-2">
                    <label className="label mb-1 block">Details <span className="text-muted">(optional — GPA, honours, etc.)</span></label>
                    <input className="field" value={ed.details} onChange={e => updateEdu(i, { details: e.target.value })} placeholder="GPA 3.9 / 4.0, Dean's List" />
                  </div>
                </div>
              </div>
            ))}
            <button className="btn-ghost w-full justify-center" onClick={() => setEducation([...education, emptyEdu()])}>
              <Plus className="h-4 w-4" /> Add education
            </button>
          </div>
        </FormSection>

        {/* Certifications */}
        <FormSection title="Certifications" description="Listed at the bottom of the resume, after education.">
          <div className="space-y-3">
            {certs.map((c, i) => (
              <div key={i} className="relative flex gap-3 rounded-lg border border-line p-3">
                <button
                  className="absolute right-2 top-2 text-muted hover:text-bad"
                  onClick={() => setCerts(certs.filter((_, j) => j !== i))}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="grid flex-1 grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="label mb-1 block">Certificate name</label>
                    <input className="field" value={c.name} onChange={e => updateCert(i, { name: e.target.value })} placeholder="AWS Solutions Architect" />
                  </div>
                  <div>
                    <label className="label mb-1 block">Year</label>
                    <input className="field" value={c.year} onChange={e => updateCert(i, { year: e.target.value })} placeholder="2023" />
                  </div>
                  <div className="col-span-3">
                    <label className="label mb-1 block">Issuer</label>
                    <input className="field" value={c.issuer} onChange={e => updateCert(i, { issuer: e.target.value })} placeholder="Amazon Web Services" />
                  </div>
                </div>
              </div>
            ))}
            <button className="btn-ghost w-full justify-center" onClick={() => setCerts([...certs, emptyCert()])}>
              <Plus className="h-4 w-4" /> Add certification
            </button>
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pb-8">
          <button className="btn-ghost" onClick={onSkip}>Skip for now</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-4">
        <h2 className="font-display font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
