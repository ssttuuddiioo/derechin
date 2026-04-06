export interface SentenciaMetadata {
  sentencia_id: string;
  tipo: "T" | "C" | "SU" | "A";
  numero: number;
  anio: number;
  fecha: string;
  magistrado_ponente: string;
  sala: string;
  proceso: string;
  expediente_tipo: string;
  expediente_numero: string;
  salvamento_voto: string | null;
  aclaracion_voto: string | null;
  url_relatoria: string;
}

export interface SentenciaSummary {
  hechos: string;
  problema_juridico: string;
  ratio_decidendi: string;
  regla_decision: string;
  decision: string;
  salvamentos_resumen: string;
  temas: string[];
  derechos: string[];
  precedente_citado: string[];
  cambio_precedente: boolean;
  nota_cambio: string;
  // Ficha jurisprudencial fields
  relevancia?: string;
  norma_demandada?: string;
  obiter_dicta?: string;
  preguntas_orientadoras?: string[];
}

export interface SentenciaTexto {
  sentencia_id: string;
  fullText: string;
  topics: string[];
  charCount: number;
  wordCount: number;
}

export interface SentenciaFull {
  metadata: SentenciaMetadata;
  summary: SentenciaSummary | null;
  texto: SentenciaTexto | null;
}
