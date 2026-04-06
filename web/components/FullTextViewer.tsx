"use client";

import { useState } from "react";
import type { SentenciaTexto } from "@/lib/types";

export default function FullTextViewer({ texto }: { texto: SentenciaTexto }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-pill bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-near-black transition-colors"
        >
          {open ? "Ocultar texto completo" : "Ver texto completo"}
        </button>
        <span className="text-sm text-silver">
          {texto.wordCount.toLocaleString()} palabras
        </span>
      </div>

      {open && (
        <div className="bg-white border border-border-lavender rounded-lg p-6 max-h-[600px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-near-black leading-relaxed font-sans">
            {texto.fullText}
          </pre>
        </div>
      )}
    </div>
  );
}
