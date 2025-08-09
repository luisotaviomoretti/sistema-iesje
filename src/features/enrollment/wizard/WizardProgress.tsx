import React from "react";

interface WizardProgressProps {
  steps: string[];
  current: number;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ steps, current }) => {
  const percent = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 space-y-3 py-2">
      <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Progresso do cadastro">
        {steps.map((s, i) => (
          <div
            key={s}
            role="listitem"
            aria-current={i === current ? "step" : undefined}
            className={`px-3 py-1 rounded-md border text-sm ${i === current ? "bg-secondary" : "bg-background"}`}
          >
            {i + 1}. {s}
          </div>
        ))}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden" aria-hidden>
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default WizardProgress;
