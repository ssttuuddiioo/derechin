import Link from "next/link";
import { sentenciaIdToSlug } from "@/lib/utils";

export default function PrecedentLinks({
  cited,
  knownIds,
}: {
  cited: string[];
  knownIds: Set<string>;
}) {
  if (!cited || cited.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {cited.map((id) => {
        const isKnown = knownIds.has(id);
        const slug = sentenciaIdToSlug(id);

        if (isKnown) {
          return (
            <Link
              key={id}
              href={`/sentencia/${slug}`}
              className="inline-flex items-center rounded-pill bg-link-cobalt/10 text-link-cobalt px-3 py-1 text-sm font-medium hover:bg-link-cobalt/20 transition-colors"
            >
              {id}
            </Link>
          );
        }

        return (
          <span
            key={id}
            className="inline-flex items-center rounded-pill bg-cloud-gray text-slate-gray px-3 py-1 text-sm font-medium"
          >
            {id}
          </span>
        );
      })}
    </div>
  );
}
