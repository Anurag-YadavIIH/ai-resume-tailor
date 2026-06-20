import type { ReactNode } from "react";
import { ArrowLeft, Award, BookOpen, ExternalLink, GraduationCap, Youtube } from "lucide-react";

interface Props {
  skill: string;
  onBack: () => void;
}

/**
 * Deep-links to search results, never to a specific guessed video/course URL — fabricating an
 * exact link could point to something unrelated or dead. Search queries are always valid.
 */
export default function LearningPage({ skill, onBack }: Props) {
  const q = encodeURIComponent(skill);

  const videoLinks = [
    { label: "YouTube tutorials", url: `https://www.youtube.com/results?search_query=${q}+tutorial` },
    { label: "YouTube crash course", url: `https://www.youtube.com/results?search_query=${q}+crash+course` },
  ];

  const freeCourses = [
    { label: "freeCodeCamp", url: `https://www.freecodecamp.org/news/search/?query=${q}` },
    { label: "Coursera (filter by Free)", url: `https://www.coursera.org/search?query=${q}` },
    { label: "edX", url: `https://www.edx.org/search?q=${q}` },
    { label: "Khan Academy / Google search", url: `https://www.google.com/search?q=free+${q}+course` },
  ];

  const certifications = [
    { label: "Coursera certificates", url: `https://www.coursera.org/search?query=${q}%20certificate` },
    { label: "Udemy (low-cost courses)", url: `https://www.udemy.com/courses/search/?q=${q}` },
    { label: "Low-cost certifications search", url: `https://www.google.com/search?q=cheap+OR+free+${q}+certification` },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <button className="btn-ghost mb-6 text-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-thread">Close this gap</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">{skill}</h1>
      <p className="mt-2 max-w-xl text-muted">
        Curated search links to start learning {skill} — these open real search results, not a
        single guessed link, so you can pick the resource that fits you best.
      </p>

      <ResourceSection icon={<Youtube className="h-4 w-4" />} title="Videos" links={videoLinks} />
      <ResourceSection icon={<BookOpen className="h-4 w-4" />} title="Free course material" links={freeCourses} />
      <ResourceSection icon={<Award className="h-4 w-4" />} title="Cost-effective certificates" links={certifications} />

      <div className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-canvas/40 p-4">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm text-muted">
          Once you've built something with {skill} — even a small project — add it to your master
          resume's projects or skills, then re-tailor. It'll start showing up as covered instead
          of a gap.
        </p>
      </div>
    </div>
  );
}

function ResourceSection({
  icon,
  title,
  links,
}: {
  icon: ReactNode;
  title: string;
  links: { label: string; url: string }[];
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm"
          >
            {l.label} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </section>
  );
}
