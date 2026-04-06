export default function Footer() {
  return (
    <footer className="mt-24 pb-12 text-center space-y-2">
      <a
        href="https://www.corteconstitucional.gov.co/relatoria/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-gray hover:text-link-cobalt transition-colors"
      >
        Relator&iacute;a Oficial
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
      <p className="text-sm text-silver">
        Datos abiertos de{" "}
        <a
          href="https://www.datos.gov.co/resource/v2k4-2t8s.json"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-link-cobalt transition-colors"
        >
          datos.gov.co
        </a>{" "}
        &middot; Corte Constitucional de Colombia (1992&ndash;presente)
      </p>
    </footer>
  );
}
