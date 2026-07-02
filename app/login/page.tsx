"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RadarSweep } from "@/components/radar-sweep";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex-1 grid lg:grid-cols-2">
      <section className="hidden lg:flex items-center justify-center relative overflow-hidden border-r border-(--border)">
        <RadarSweep size={460} />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-display text-2xl text-(--fg) leading-snug max-w-sm">
            Un barrido sobre cada CUIT: BCRA y ARCA, en una sola lectura.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-(--fg)">
              Radar
            </h1>
            <p className="mt-2 text-sm text-(--fg-muted)">
              Iniciá sesión para consultar la situación fiscal y crediticia de un CUIT.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-(--fg-muted) mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-(--surface) border border-(--border) px-3.5 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-faint) focus:border-(--radar-dim) transition-colors"
                placeholder="vos@estudio.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-(--fg-muted) mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-(--surface) border border-(--border) px-3.5 py-2.5 text-sm text-(--fg) placeholder:text-(--fg-faint) focus:border-(--radar-dim) transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-(--danger)" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-(--radar) text-(--bg) font-medium text-sm py-2.5 hover:brightness-110 active:brightness-95 transition disabled:opacity-50"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-sm text-(--fg-muted)">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-(--radar) hover:underline">
              Creá una
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
