import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="panel-surface p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-slateWarm-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
