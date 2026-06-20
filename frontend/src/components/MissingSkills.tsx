import { AlertTriangle } from "lucide-react";
import type { MissingSkill } from "../types";

const severityStyle: Record<string, string> = {
  high: "border-bad/30 bg-bad/5 text-bad",
  medium: "border-warn/30 bg-warn/5 text-warn",
  low: "border-line bg-canvas text-muted",
};

export default function MissingSkills({
  skills,
  onLearnSkill,
}: {
  skills: MissingSkill[];
  onLearnSkill?: (skill: string) => void;
}) {
  if (!skills?.length) {
    return (
      <p className="text-sm text-ok">
        No major gaps found — your resume covers the role's core requirements.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {skills.map((s, i) => (
        <li
          key={i}
          className={`rounded-lg border px-3 py-2.5 ${
            severityStyle[s.severity] ?? severityStyle.low
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {onLearnSkill ? (
              <button
                className="text-sm font-semibold text-ink hover:underline"
                onClick={() => onLearnSkill(s.skill)}
              >
                {s.skill}
              </button>
            ) : (
              <span className="text-sm font-semibold text-ink">{s.skill}</span>
            )}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wide">
              {s.severity}
            </span>
          </div>
          {s.suggestion && (
            <p className="mt-1 pl-6 text-xs text-muted">{s.suggestion}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
