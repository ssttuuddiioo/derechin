export default function SummarySection({
  title,
  content,
  defaultOpen = false,
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
}) {
  if (!content) return null;

  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="flex items-center gap-3 cursor-pointer py-3 text-subheading tracking-subheading text-black select-none">
        <svg
          className="w-4 h-4 text-silver transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        {title}
      </summary>
      <div className="pl-7 pb-4 border-l-[3px] border-black ml-2">
        <p className="text-base text-near-black leading-relaxed">{content}</p>
      </div>
    </details>
  );
}
