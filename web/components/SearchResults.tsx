"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { TIPO_CONFIG } from "@/lib/constants";
import type { TrendingItem } from "@/app/page";

type TipoKey = keyof typeof TIPO_CONFIG;

interface SearchResult {
  sentencia_id: string;
  tipo: string;
  fecha: string;
  magistrado_ponente: string;
  url_relatoria: string;
  temas: string[];
  snippet: string;
}

function ResultCard({ result: r }: { result: SearchResult }) {
  const [copied, setCopied] = useState(false);
  const config = TIPO_CONFIG[r.tipo as TipoKey] || TIPO_CONFIG.T;
  const year = r.fecha ? new Date(r.fecha + "T00:00:00").getFullYear() : "";

  // Use first tema as title, clean up the dash format
  const mainTema = r.temas[0] || "";
  const title = mainTema
    ? mainTema.replace(/-/g, " \u2014 ").replace(/\s+/g, " ")
    : r.sentencia_id;
  const extraTemas = r.temas.slice(1, 4);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(r.sentencia_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const relatoriaUrl = r.url_relatoria || `https://www.corteconstitucional.gov.co/relatoria/`;

  return (
    <a
      href={relatoriaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 hover:bg-white hover:shadow-whisper transition-all"
    >
      {/* Top row: tipo dot + title + sentencia ID tag */}
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-start gap-2 min-w-0">
          <span
            className="mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: config.bg }}
          />
          <h3 className="text-[15px] font-semibold text-black leading-snug">
            {title}
          </h3>
        </div>

        {/* Sentencia ID tag with copy */}
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1 rounded-md bg-cloud-gray border border-border-lavender px-2 py-0.5 text-xs font-mono text-slate-gray hover:bg-white hover:border-input-border transition-colors"
          title="Copiar referencia"
        >
          <span>{r.sentencia_id}</span>
          {copied ? (
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Meta line */}
      <p className="text-xs text-silver mb-1.5 pl-[18px] text-left">
        {config.label}
        {year && <span> &middot; {year}</span>}
        {r.magistrado_ponente && <span> &middot; MP: {r.magistrado_ponente}</span>}
      </p>

      {/* Snippet */}
      {r.snippet && (
        <p className="text-sm text-mid-slate leading-relaxed mb-2 pl-[18px] text-left">
          {r.snippet.length > 180
            ? r.snippet.slice(0, 180) + "..."
            : r.snippet}
        </p>
      )}

      {/* Extra temas */}
      {extraTemas.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-[18px]">
          {extraTemas.map((t) => (
            <span
              key={t}
              className="rounded-pill px-2 py-0.5 text-[10px] font-medium bg-cloud-gray text-slate-gray"
            >
              {t.length > 40 ? t.slice(0, 40) + "..." : t}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export default function SearchResults({ trending = [] }: { trending?: TrendingItem[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTipos, setActiveTipos] = useState<TipoKey[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!controller.signal.aborted) {
        setResults(data.results || []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearTimeout(timerRef.current);
    doSearch(query);
  };

  const toggleTipo = (tipo: TipoKey) => {
    setActiveTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const filtered = useMemo(() => {
    if (activeTipos.length === 0) return results;
    return results.filter((r) => activeTipos.includes(r.tipo as TipoKey));
  }, [results, activeTipos]);

  return (
    <div>
      {/* Search input */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <svg
            className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-silver"
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
            value={query}
            onChange={handleChange}
            placeholder="Buscar: tutela, salud, aborto, eutanasia, T-760/08..."
            className="w-full rounded-pill bg-white border border-input-border pl-14 pr-5 py-4 text-lg text-near-black placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-link-cobalt/30 focus:border-link-cobalt transition-colors shadow-whisper"
            autoFocus
          />
          {loading && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-silver border-t-link-cobalt rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Tipo filters — disabled until results show */}
      <div className="flex flex-wrap items-center gap-2 justify-center mb-8">
        {(Object.keys(TIPO_CONFIG) as TipoKey[]).map((tipo) => {
          const config = TIPO_CONFIG[tipo];
          const hasResults = results.length > 0;
          const active = hasResults && activeTipos.includes(tipo);
          return (
            <button
              key={tipo}
              onClick={() => hasResults && toggleTipo(tipo)}
              disabled={!hasResults}
              className="rounded-pill px-3 py-1 text-sm font-medium border transition-all disabled:cursor-default"
              style={
                active
                  ? {
                      backgroundColor: config.bg,
                      color: config.text,
                      borderColor: config.bg,
                    }
                  : {
                      backgroundColor: "#ffffff",
                      color: hasResults ? "#60646c" : "#b0b4ba",
                      borderColor: "#e0e1e6",
                      opacity: hasResults ? 1 : 0.5,
                    }
              }
            >
              {tipo} &middot; {config.label}
            </button>
          );
        })}
      </div>

      {/* Trending — shown when no search */}
      {!searched && !loading && trending.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-silver mb-5 text-center">
            Tendencias esta semana
          </p>
          <div className="space-y-1">
            {trending.map((t) => {
              const config = TIPO_CONFIG[t.tipo as TipoKey] || TIPO_CONFIG.T;
              const mainTema = t.temas[0] || "";
              const title = mainTema
                ? mainTema.replace(/-/g, " \u2014 ").replace(/\s+/g, " ")
                : t.sentencia_id;
              const year = t.fecha ? new Date(t.fecha + "T00:00:00").getFullYear() : "";

              return (
                <a
                  key={t.sentencia_id}
                  href={t.url_relatoria || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl p-4 hover:bg-white hover:shadow-whisper transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: config.bg }}
                      />
                      <h3 className="text-[15px] font-semibold text-black leading-snug">
                        {title}
                      </h3>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-cloud-gray border border-border-lavender px-2 py-0.5 text-xs font-mono text-slate-gray">
                      {t.sentencia_id}
                    </span>
                  </div>
                  <p className="text-xs text-silver mb-1.5 pl-[18px] text-left">
                    {config.label}
                    {year && <span> &middot; {year}</span>}
                    {t.magistrado_ponente && <span> &middot; MP: {t.magistrado_ponente}</span>}
                  </p>
                  {t.snippet && (
                    <p className="text-sm text-mid-slate leading-relaxed pl-[18px] text-left">
                      {t.snippet.length > 160 ? t.snippet.slice(0, 160) + "..." : t.snippet}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
          <p className="text-[11px] text-silver mt-6 text-center">
            Pr&oacute;ximamente: tendencias reales basadas en b&uacute;squedas de usuarios
          </p>
        </div>
      )}

      {/* Results */}
      {searched && !loading && filtered.length === 0 && (
        <p className="text-center text-silver py-12 text-body-lg">
          No se encontraron resultados para &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-1">
          <p className="text-xs text-silver mb-4">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </p>

          {filtered.map((r) => (
            <ResultCard key={r.sentencia_id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
