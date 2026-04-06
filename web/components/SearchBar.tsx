"use client";

import { useCallback, useRef } from "react";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), 300);
    },
    [onChange]
  );

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder="Buscar por sentencia, magistrado o tema..."
        className="w-full rounded-pill bg-white border border-input-border pl-12 pr-4 py-3 text-base text-near-black placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-link-cobalt/30 focus:border-link-cobalt transition-colors"
      />
    </div>
  );
}
