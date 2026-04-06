import { TIPO_CONFIG } from "@/lib/constants";

export default function TipoBadge({
  tipo,
  size = "sm",
}: {
  tipo: keyof typeof TIPO_CONFIG;
  size?: "sm" | "lg";
}) {
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.T;
  const sizeClasses =
    size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-pill font-medium ${sizeClasses}`}
      style={{ backgroundColor: config.bg, color: config.text }}
      title={config.label}
    >
      {tipo}
      <span className="hidden sm:inline ml-1">&middot; {config.label}</span>
    </span>
  );
}
