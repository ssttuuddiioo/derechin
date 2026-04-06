"use client";

import { useState } from "react";
import type { SentenciaSummary } from "@/lib/types";
import FichaJurisprudencial from "./FichaJurisprudencial";

export default function SummarizeForm() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    sentencia_id: string;
    summary: SentenciaSummary;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const isUrl = input.startsWith("http");
      const body = isUrl
        ? { url: input.trim() }
        : { sentencia_id: input.trim() };

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error desconocido");
        return;
      }

      setResult(data);
    } catch {
      setError("Error de conexi\u00f3n");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-12">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pega una URL de relator\u00eda o escribe un ID (ej: T-323/24)..."
            className="flex-1 rounded-pill bg-white border border-input-border pl-6 pr-4 py-3.5 text-base text-near-black placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-link-cobalt/30 focus:border-link-cobalt transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-pill bg-black text-white px-6 py-3.5 text-sm font-medium hover:bg-near-black transition-colors disabled:opacity-40"
          >
            {loading ? "Analizando..." : "Resumir"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-black/90 rounded-2xl p-6 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-1/3 mb-4" />
            <div className="h-5 bg-white/10 rounded w-3/4" />
          </div>
          <div className="bg-white rounded-2xl border border-border-lavender p-6 animate-pulse">
            <div className="h-3 bg-cloud-gray rounded w-1/4 mb-4" />
            <div className="h-4 bg-cloud-gray rounded w-full mb-3" />
            <div className="h-4 bg-cloud-gray rounded w-5/6 mb-6" />
            <div className="h-3 bg-cloud-gray rounded w-1/4 mb-4" />
            <div className="h-4 bg-cloud-gray rounded w-full mb-3" />
            <div className="h-4 bg-cloud-gray rounded w-2/3" />
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border-l-4 border-warning-amber bg-warning-amber/5 p-5">
            <p className="text-sm text-near-black">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="max-w-3xl mx-auto">
          <FichaJurisprudencial summary={result.summary} />
        </div>
      )}
    </div>
  );
}
