"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function AppHeader({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-(--border) px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-semibold text-(--fg)">
          Radar
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-(--radar) animate-pulse" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-(--fg-muted) hidden sm:inline">{email}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-(--fg-muted) hover:text-(--fg) transition-colors"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>
    </header>
  );
}
