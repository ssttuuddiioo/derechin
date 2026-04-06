"use client";

import { useState, useMemo } from "react";
import type { SentenciaMetadata, SentenciaSummary } from "@/lib/types";
import SentenciaCard from "./SentenciaCard";
import SearchBar from "./SearchBar";
import FilterPanel, { type Filters } from "./FilterPanel";

const PAGE_SIZE = 24;

export default function SentenciaGrid({
  sentencias,
  summaries,
  availableAnios,
}: {
  sentencias: SentenciaMetadata[];
  summaries: Record<string, SentenciaSummary>;
  availableAnios: number[];
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    tipos: [],
    anioMin: null,
    anioMax: null,
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let results = sentencias;

    if (search) {
      const q = search.toLowerCase();
      results = results.filter((s) => {
        const summary = summaries[s.sentencia_id];
        const temas = summary?.temas?.join(" ").toLowerCase() || "";
        return (
          s.sentencia_id.toLowerCase().includes(q) ||
          s.magistrado_ponente.toLowerCase().includes(q) ||
          temas.includes(q)
        );
      });
    }

    if (filters.tipos.length > 0) {
      results = results.filter((s) => filters.tipos.includes(s.tipo));
    }

    if (filters.anioMin) {
      results = results.filter((s) => s.anio >= filters.anioMin!);
    }
    if (filters.anioMax) {
      results = results.filter((s) => s.anio <= filters.anioMax!);
    }

    return results;
  }, [sentencias, summaries, search, filters]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-8">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="mb-10">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          availableAnios={availableAnios}
        />
      </div>

      <p className="text-sm text-slate-gray mb-6 text-center">
        {filtered.length} sentencia{filtered.length !== 1 ? "s" : ""}{" "}
        encontrada{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-center text-silver py-16 text-body-lg">
          No se encontraron resultados
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((s) => (
              <SentenciaCard
                key={s.sentencia_id}
                sentencia={s}
                summary={summaries[s.sentencia_id]}
              />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-pill bg-white border border-input-border px-6 py-2.5 text-sm font-medium text-near-black hover:shadow-whisper transition-shadow"
              >
                Cargar m&aacute;s
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
