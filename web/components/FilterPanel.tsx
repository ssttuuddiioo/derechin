"use client";

import { TIPO_CONFIG } from "@/lib/constants";

type TipoKey = keyof typeof TIPO_CONFIG;

export interface Filters {
  tipos: TipoKey[];
  anioMin: number | null;
  anioMax: number | null;
}

export default function FilterPanel({
  filters,
  onChange,
  availableAnios,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  availableAnios: number[];
}) {
  const toggleTipo = (tipo: TipoKey) => {
    const current = filters.tipos;
    const next = current.includes(tipo)
      ? current.filter((t) => t !== tipo)
      : [...current, tipo];
    onChange({ ...filters, tipos: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 justify-center">
      {(Object.keys(TIPO_CONFIG) as TipoKey[]).map((tipo) => {
        const config = TIPO_CONFIG[tipo];
        const active =
          filters.tipos.length === 0 || filters.tipos.includes(tipo);
        return (
          <button
            key={tipo}
            onClick={() => toggleTipo(tipo)}
            className="rounded-pill px-3.5 py-1.5 text-sm font-medium border transition-all"
            style={
              active
                ? {
                    backgroundColor: config.bg,
                    color: config.text,
                    borderColor: config.bg,
                  }
                : {
                    backgroundColor: "#ffffff",
                    color: "#b0b4ba",
                    borderColor: "#e0e1e6",
                  }
            }
          >
            {tipo} &middot; {config.label}
          </button>
        );
      })}

      <select
        value={filters.anioMin ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            anioMin: e.target.value ? Number(e.target.value) : null,
          })
        }
        className="rounded-md border border-input-border bg-white px-3 py-1.5 text-sm text-near-black"
      >
        <option value="">Desde...</option>
        {availableAnios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={filters.anioMax ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            anioMax: e.target.value ? Number(e.target.value) : null,
          })
        }
        className="rounded-md border border-input-border bg-white px-3 py-1.5 text-sm text-near-black"
      >
        <option value="">Hasta...</option>
        {availableAnios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
