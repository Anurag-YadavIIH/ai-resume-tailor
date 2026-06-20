import type { ReactNode } from "react";
import { LayoutDashboard, Scissors, User, Wand2 } from "lucide-react";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile | null;
  onGoDashboard: () => void;
  onNewTailor: () => void;
  onEditProfile: () => void;
}

export default function HomePage({ profile, onGoDashboard, onNewTailor, onEditProfile }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
        <Scissors className="h-5 w-5" />
      </span>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-thread">
        AI resume workbench
      </p>
      <h1 className="mt-2 text-center font-display text-4xl font-bold leading-tight text-ink">
        Hey{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}. Where to?
      </h1>
      <p className="mt-3 max-w-md text-center text-muted">
        Tailor a new resume, check on past ones, or update your profile.
      </p>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
        <HomeTile
          icon={<Wand2 className="h-5 w-5" />}
          title="New tailored resume"
          description="Pick a saved resume + a job description"
          onClick={onNewTailor}
          primary
        />
        <HomeTile
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Dashboard"
          description="Stats, history, and compare-to-job"
          onClick={onGoDashboard}
        />
        <HomeTile
          icon={<User className="h-5 w-5" />}
          title="Profile"
          description="Contact details, education, certifications"
          onClick={onEditProfile}
        />
      </div>
    </div>
  );
}

function HomeTile({
  icon,
  title,
  description,
  onClick,
  primary,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift ${
        primary ? "border-brand bg-brand-soft" : "border-line bg-surface"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          primary ? "bg-brand text-white" : "bg-canvas text-ink group-hover:bg-brand-soft group-hover:text-brand"
        }`}
      >
        {icon}
      </span>
      <span className="font-display text-base font-semibold text-ink">{title}</span>
      <span className="text-sm text-muted">{description}</span>
    </button>
  );
}
