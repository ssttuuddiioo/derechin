export function sentenciaIdToSlug(id: string): string {
  return id.toLowerCase().replace("/", "-");
}

export function slugToSentenciaId(slug: string): string {
  const match = slug.match(/^(t|c|su|a)-(\d+)-(\d+)$/i);
  if (!match) return slug;
  const [, tipo, numero, anio] = match;
  return `${tipo.toUpperCase()}-${numero}/${anio}`;
}

export function formatFecha(fecha: string): string {
  const date = new Date(fecha + "T00:00:00");
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
