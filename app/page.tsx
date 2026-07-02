import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 flex flex-col">
      <AppHeader email={user.email ?? ""} />
      <Dashboard />
      <footer className="px-6 py-4 text-center text-xs text-(--fg-faint) border-t border-(--border)">
        Creado por alumno Diplo IA FCE UBA
      </footer>
    </main>
  );
}
