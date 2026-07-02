"use client";

import { useState } from "react";

function formatearMientrasEscribe(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function CuitSearch({
  onSearch,
  loading,
}: {
  onSearch: (cuit: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) onSearch(digits);
  }

  const digits = value.replace(/\D/g, "");
  const valido = digits.length === 11;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          value={value}
          onChange={(e) => setValue(formatearMientrasEscribe(e.target.value))}
          placeholder="20-12345678-9"
          inputMode="numeric"
          aria-label="CUIT a consultar"
          className="w-full rounded-md bg-(--surface) border border-(--border) px-4 py-3 text-base font-display tracking-wide text-(--fg) placeholder:text-(--fg-faint) focus:border-(--radar-dim) transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={!valido || loading}
        className="shrink-0 rounded-md bg-(--radar) text-(--bg) font-medium text-sm px-6 hover:brightness-110 active:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Escaneando…" : "Escanear"}
      </button>
    </form>
  );
}
