import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-cloud-gray/80 border-b border-border-lavender">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-black font-bold text-lg tracking-tight">
          Corte Constitucional Explorer
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/resumir"
            className="text-sm font-medium text-slate-gray hover:text-black transition-colors"
          >
            Resumir
          </Link>
          <Link
            href="/linea"
            className="text-sm font-medium text-slate-gray hover:text-black transition-colors"
          >
            L&iacute;neas
          </Link>
        </div>
      </div>
    </nav>
  );
}
