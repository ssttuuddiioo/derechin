"use client";

import Link from "next/link";
import { sentenciaIdToSlug } from "@/lib/utils";
import { TIPO_CONFIG } from "@/lib/constants";

interface TimelineEntry {
  sentencia_id: string;
  tipo: string;
  fecha: string;
  magistrado_ponente: string;
  ratio_decidendi: string;
  decision: string;
  cambio_precedente: boolean;
  nota_cambio: string;
}

export default function Timeline({ data }: { data: TimelineEntry[] }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border-lavender" />

      <div className="space-y-8">
        {data.map((entry, i) => {
          const config =
            TIPO_CONFIG[entry.tipo as keyof typeof TIPO_CONFIG] ||
            TIPO_CONFIG.T;
          const slug = sentenciaIdToSlug(entry.sentencia_id);
          const year = new Date(entry.fecha).getFullYear();

          return (
            <div key={entry.sentencia_id} className="relative pl-16">
              {/* Dot on timeline */}
              <div
                className="absolute left-4 top-3 w-5 h-5 rounded-full border-[3px] border-white"
                style={{
                  backgroundColor: entry.cambio_precedente
                    ? "#ab6400"
                    : config.bg,
                }}
              />

              {/* Year label */}
              {(i === 0 ||
                new Date(data[i - 1].fecha).getFullYear() !== year) && (
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-2">
                  {year}
                </div>
              )}

              {/* Card */}
              <Link
                href={`/sentencia/${slug}`}
                className="block bg-white rounded-lg border border-border-lavender p-5 hover:shadow-whisper transition-shadow"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span
                    className="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: config.bg,
                      color: config.text,
                    }}
                  >
                    {entry.sentencia_id}
                  </span>
                  {entry.cambio_precedente && (
                    <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium bg-warning-amber/10 text-warning-amber">
                      Cambio de precedente
                    </span>
                  )}
                </div>

                <p className="text-sm text-near-black leading-relaxed mb-2">
                  {entry.ratio_decidendi
                    ? entry.ratio_decidendi.slice(0, 200) +
                      (entry.ratio_decidendi.length > 200 ? "..." : "")
                    : entry.decision}
                </p>

                <p className="text-xs text-silver">
                  MP: {entry.magistrado_ponente}
                </p>

                {entry.cambio_precedente && entry.nota_cambio && (
                  <div className="mt-3 rounded-lg border-l-[3px] border-warning-amber bg-warning-amber/5 px-3 py-2">
                    <p className="text-xs text-near-black">
                      {entry.nota_cambio}
                    </p>
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
