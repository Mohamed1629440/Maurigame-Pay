export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-[var(--stone-200)] rounded-sm p-6 transition-colors duration-200 hover:border-[var(--bronze-light)]">
      <p className="kp-eyebrow text-[var(--bronze)] mb-3">— {label}</p>
      <p className="serif text-3xl font-medium text-[var(--ink)] leading-none tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="mt-2 font-mono text-[11px] tracking-wider text-[var(--stone-500)]">
          {hint}
        </p>
      )}
    </div>
  );
}
