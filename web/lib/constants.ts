export const TIPO_CONFIG = {
  T: { label: "Tutela", bg: "#0d74ce", text: "#ffffff" },
  C: { label: "Constitucionalidad", bg: "#8145b5", text: "#ffffff" },
  SU: { label: "Unificaci\u00f3n", bg: "#47c2ff", text: "#1c2024" },
  A: { label: "Auto", bg: "#ab6400", text: "#ffffff" },
} as const;

export const FICHA_SECTIONS = [
  { key: "relevancia", label: "Relevancia", icon: "\u2605" },
  { key: "hechos", label: "S\u00edntesis de los Hechos", icon: "\u25b6" },
  { key: "problema_juridico", label: "Problema Jur\u00eddico", icon: "?" },
  { key: "ratio_decidendi", label: "Ratio Decidendi", icon: "\u00a7" },
  { key: "regla_decision", label: "Regla de Decisi\u00f3n", icon: "\u2192" },
  { key: "decision", label: "Decisi\u00f3n", icon: "\u2713" },
  { key: "obiter_dicta", label: "Obiter Dicta", icon: "\u00b6" },
  { key: "salvamentos_resumen", label: "Salvamentos de Voto", icon: "\u2020" },
] as const;
