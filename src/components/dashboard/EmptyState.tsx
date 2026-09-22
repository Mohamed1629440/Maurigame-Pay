export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[var(--stone-300)] bg-white rounded-sm p-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mx-auto mb-4 text-[var(--stone-400)]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h.01M15 9h.01M9 15s1 1.5 3 1.5 3-1.5 3-1.5" />
      </svg>
      <p className="serif text-lg font-medium text-[var(--ink)] italic">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[var(--stone-600)] max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
