import { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <p className="kp-eyebrow text-[var(--bronze)] mb-3">— {eyebrow}</p>
        <h1 className="kp-section-title text-[var(--ink)]">{title}</h1>
        {description && (
          <p className="mt-3 text-sm text-[var(--stone-600)] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
