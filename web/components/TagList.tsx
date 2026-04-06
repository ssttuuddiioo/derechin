export default function TagList({
  tags,
  variant = "default",
}: {
  tags: string[];
  variant?: "default" | "accent";
}) {
  if (!tags || tags.length === 0) return null;

  const baseClasses = "inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium";
  const variantClasses =
    variant === "accent"
      ? "bg-link-cobalt/10 text-link-cobalt"
      : "bg-cloud-gray text-slate-gray";

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className={`${baseClasses} ${variantClasses}`}>
          {tag}
        </span>
      ))}
    </div>
  );
}
