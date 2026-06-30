import { Building2, Scale, ShieldCheck, Users } from "lucide-react";
import { APP_TAGLINE } from "@/lib/constants";

const AUDIENCES = [
  { icon: Building2, label: "SaaS teams", detail: "Onboard users with docs that answer for themselves" },
  { icon: Users, label: "HR teams", detail: "Answer policy questions instantly, consistently" },
  { icon: Scale, label: "Law firms", detail: "Search case files and SOPs without leaving the matter" },
];

export function WelcomeSection() {
  return (
    <div className="mb-6">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
        <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
        Runs locally — your documents never leave your infrastructure
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Ask your documents anything
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">
        {APP_TAGLINE} Upload a PDF, SOP, DOCX, or Markdown file below and start a conversation
        grounded entirely in its contents.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {AUDIENCES.map(({ icon: Icon, label, detail }) => (
          <div
            key={label}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-card/60 px-3.5 py-3"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-sm font-medium leading-tight">{label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
