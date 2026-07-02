"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RadarSweep } from "@/components/radar-sweep";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  return (
    <main className="flex-1 grid lg:grid-cols-2">
      <section className="hidden lg:flex items-center justify-center relative overflow-hidden border-r border-(--border)">
        <RadarSweep size={460} />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-display text-2xl text-(--fg) leading-snug max-w-sm">
            Situación crediticia, deuda y datos fiscales, sin perseguir diez pestañas.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {done ? (
            <div>
              <h1 className="font-display text-2xl font-semibold text-(--fg)">Revisá tu correo</h1>
              <p className="mt-3 text-sm text-(--fg-muted)">
                Te enviamos un enlace de confirmación a <strong className="text-(--fg)">{email}</strong>.
                Confirmá tu cuenta para poder ingresar.
              </p>
              <Link href="/login" className="mt-6 inline-block text-sm text-(--radar) hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-(--fg)">
                  Crear cuenta
                </h1>
                <p className="mt-2 text-sm text-(--fg-muted)">
                  Registrate para empezar a consultar CUITs.
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
                    placeholder="Mínimo 6 caracteres"
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
                  {loading ? "Creando cuenta…" : "Crear cuenta"}
                </button>
              </form>

              <p className="mt-6 text-sm text-(--fg-muted)">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="text-(--radar) hover:underline">
                  Ingresá
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
