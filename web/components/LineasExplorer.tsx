"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface TemaGroup {
  root: string;
  total: number;
  subtemas: Array<{ tema: string; count: number }>;
}

// Color palette for bento boxes
const BENTO_COLORS = [
  { bg: "#0d74ce", text: "#ffffff" },
  { bg: "#8145b5", text: "#ffffff" },
  { bg: "#1c2024", text: "#ffffff" },
  { bg: "#47c2ff", text: "#1c2024" },
  { bg: "#ab6400", text: "#ffffff" },
  { bg: "#10b981", text: "#ffffff" },
  { bg: "#0d74ce", text: "#ffffff" },
  { bg: "#363a3f", text: "#ffffff" },
  { bg: "#8145b5", text: "#ffffff" },
  { bg: "#ab6400", text: "#ffffff" },
  { bg: "#1c2024", text: "#ffffff" },
  { bg: "#47c2ff", text: "#1c2024" },
];

export default function LineasExplorer({
  featured,
  allGroups,
}: {
  featured: TemaGroup[];
  allGroups: TemaGroup[];
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allGroups.filter(
      (g) =>
        g.root.toLowerCase().includes(q) ||
        g.subtemas.some((s) => s.tema.toLowerCase().includes(q))
    );
  }, [search, allGroups]);

  const showSearch = search.length >= 2;

  return (
    <div>
      {/* Search */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar l\u00ednea jurisprudencial..."
            className="w-full rounded-pill bg-white border border-input-border pl-12 pr-4 py-3 text-base text-near-black placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-link-cobalt/30 focus:border-link-cobalt transition-colors"
          />
        </div>
      </div>

      {/* Search results */}
      {showSearch && (
        <div className="mb-12">
          <p className="text-xs text-silver mb-4">
            {filtered.length} l&iacute;nea{filtered.length !== 1 ? "s" : ""}{" "}
            encontrada{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.slice(0, 30).map((g) => (
                <GroupCard
                  key={g.root}
                  group={g}
                  expanded={expanded === g.root}
                  onToggle={() =>
                    setExpanded(expanded === g.root ? null : g.root)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-silver py-8">
              No se encontraron l&iacute;neas para &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Bento featured (hide when searching) */}
      {!showSearch && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-6">
            Principales l&iacute;neas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
            {featured.map((g, i) => {
              const color = BENTO_COLORS[i % BENTO_COLORS.length];
              return (
                <Link
                  key={g.root}
                  href={`/linea/${encodeURIComponent(g.subtemas[0]?.tema || g.root)}`}
                  className="rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-elevated"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  <p className="text-[13px] font-bold leading-tight mb-3">
                    {g.root}
                  </p>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-black opacity-80">
                      {g.total}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {g.subtemas.length} subtema
                      {g.subtemas.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* All groups */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-6">
            Todas las l&iacute;neas ({allGroups.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allGroups.slice(0, 60).map((g) => (
              <GroupCard
                key={g.root}
                group={g}
                expanded={expanded === g.root}
                onToggle={() =>
                  setExpanded(expanded === g.root ? null : g.root)
                }
              />
            ))}
          </div>
          {allGroups.length > 60 && (
            <p className="text-center text-sm text-silver mt-8">
              Usa la b&uacute;squeda para encontrar las {allGroups.length - 60}{" "}
              l&iacute;neas restantes
            </p>
          )}
        </>
      )}
    </div>
  );
}

function GroupCard({
  group,
  expanded,
  onToggle,
}: {
  group: TemaGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-border-lavender overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-2 hover:bg-cloud-gray/50 transition-colors"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black leading-snug">
            {group.root}
          </h3>
          <p className="text-xs text-silver mt-0.5">
            {group.total} sentencia{group.total !== 1 ? "s" : ""} &middot;{" "}
            {group.subtemas.length} subtema
            {group.subtemas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-silver flex-shrink-0 mt-0.5 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-border-lavender pt-2 space-y-1">
          {group.subtemas.slice(0, 10).map((s) => (
            <Link
              key={s.tema}
              href={`/linea/${encodeURIComponent(s.tema)}`}
              className="flex items-center justify-between py-1.5 text-sm hover:text-link-cobalt transition-colors"
            >
              <span className="text-near-black truncate mr-2">{s.tema}</span>
              <span className="text-xs text-silver flex-shrink-0">
                {s.count}
              </span>
            </Link>
          ))}
          {group.subtemas.length > 10 && (
            <p className="text-xs text-silver pt-1">
              +{group.subtemas.length - 10} m&aacute;s
            </p>
          )}
        </div>
      )}
    </div>
  );
}
