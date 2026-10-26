import type { ReactNode } from "react";

export function PageHeader({ title, description, badge }: { title: string; description?: string; badge?: ReactNode }) {
  return (
    <div className="pt-12 pb-8 sm:pt-16">
      {badge ? <div className="mb-3">{badge}</div> : null}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{description}</p> : null}
    </div>
  );
}
