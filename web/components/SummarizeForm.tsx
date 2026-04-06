"use client";

import { useState } from "react";
import type { SentenciaSummary } from "@/lib/types";
import FichaJurisprudencial from "./FichaJurisprudencial";

interface QuickResult {
  problema_juridico: string;
  decision: string;
  temas: string[];
  relevancia: string;
}

export default function SummarizeForm() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quickResult, setQuickResult] = useState<{
    sentencia_id: string;
    summary: QuickResult;
  } | null>(null);
  const [fullResult, setFullResult] = useState<{
    sentencia_id: string;
    summary: SentenciaSummary;
  } | null>(null);

  // Email gate state
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [chosenIntent, setChosenIntent] = useState<"full_now" | "wait" | null>(null);

  const getBody = (mode: string) => {
    const isUrl = input.startsWith("http");
    return {
      ...(isUrl ? { url: input.trim() } : { sentencia_id: input.trim() }),
      mode,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setQuickResult(null);
    setFullResult(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getBody("quick")),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error desconocido");
        return;
      }
      setQuickResult(data);
    } catch {
      setError("Error de conexi\u00f3n");
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    setShowEmailGate(true);
  };

  const submitEmail = async (intent: "full_now" | "wait") => {
    if (!email.trim() || !email.includes("@")) return;
    setSubmittingEmail(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          intent,
          sentencia_id: quickResult?.sentencia_id || null,
        }),
      });
      setEmailSubmitted(true);
      setChosenIntent(intent);
    } catch {
      // Still show thank you
      setEmailSubmitted(true);
      setChosenIntent(intent);
    } finally {
      setSubmittingEmail(false);
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

      {/* Loading skeleton */}
      {loading && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-border-lavender p-6 animate-pulse">
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

      {/* Full ficha (replaces quick) */}
      {fullResult && (
        <div className="max-w-3xl mx-auto">
          <FichaJurisprudencial summary={fullResult.summary} />
        </div>
      )}

      {/* Quick result */}
      {quickResult && !fullResult && (
        <div className="max-w-2xl mx-auto">
          {quickResult.sentencia_id && (
            <p className="text-xs text-silver mb-3">
              {quickResult.sentencia_id}
            </p>
          )}

          <div className="bg-white rounded-2xl border border-border-lavender p-6 space-y-4">
            {/* Relevancia */}
            {quickResult.summary.relevancia && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-1">
                  Relevancia
                </p>
                <p className="text-base text-near-black leading-relaxed">
                  {quickResult.summary.relevancia}
                </p>
              </div>
            )}

            {/* Problema jurídico */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-1">
                Problema Jur&iacute;dico
              </p>
              <p className="text-base text-near-black leading-relaxed italic">
                {quickResult.summary.problema_juridico}
              </p>
            </div>

            {/* Decisión */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-1">
                Decisi&oacute;n
              </p>
              <p className="text-base text-near-black leading-relaxed">
                {quickResult.summary.decision}
              </p>
            </div>

            {/* Temas */}
            {quickResult.summary.temas?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {quickResult.summary.temas.map((t) => (
                  <span
                    key={t}
                    className="rounded-pill px-2.5 py-0.5 text-xs font-medium bg-cloud-gray text-slate-gray"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Email gate or expand button */}
          {emailSubmitted ? (
            <div className="mt-6 bg-white rounded-2xl border border-border-lavender p-6 text-center space-y-3">
              <p className="text-base text-near-black font-medium">
                {chosenIntent === "full_now"
                  ? "Recibimos tu email. Te enviaremos acceso a la ficha completa muy pronto."
                  : "Gracias por tu interés. Te avisaremos cuando la app esté lista."}
              </p>
              <p className="text-sm text-slate-gray">
                Estamos construyendo algo especial para el derecho constitucional colombiano.
              </p>
            </div>
          ) : showEmailGate ? (
            <div className="mt-6 bg-white rounded-2xl border border-border-lavender p-6 space-y-4">
              <p className="text-sm text-near-black text-center">
                Deja tu email para acceder a la ficha completa. Estamos construyendo la app.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-pill bg-white border border-input-border pl-6 pr-4 py-3 text-base text-near-black placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-link-cobalt/30 focus:border-link-cobalt transition-colors"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => submitEmail("full_now")}
                  disabled={submittingEmail || !email.includes("@")}
                  className="flex-1 rounded-pill bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-near-black transition-colors disabled:opacity-40"
                >
                  {submittingEmail ? "Enviando..." : "Quiero la ficha completa ahora"}
                </button>
                <button
                  onClick={() => submitEmail("wait")}
                  disabled={submittingEmail || !email.includes("@")}
                  className="flex-1 rounded-pill border border-border-lavender bg-white text-near-black px-5 py-2.5 text-sm font-medium hover:bg-cloud-gray transition-colors disabled:opacity-40"
                >
                  {submittingEmail ? "Enviando..." : "Espero a que terminen la app"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <button
                onClick={handleExpand}
                className="rounded-pill bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-near-black transition-colors"
              >
                Ver ficha jurisprudencial completa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
