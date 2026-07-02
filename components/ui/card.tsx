export function Card({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-(--border) bg-(--surface) p-5 ${className}`}
    >
      {(eyebrow || title) && (
        <div className="mb-4">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-wider text-(--fg-faint) font-medium mb-1">
              {eyebrow}
            </p>
          )}
          {title && (
            <h3 className="font-display text-base font-semibold text-(--radar)">
              {title}
            </h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
