"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearVaultKey } from "@/lib/vault-key-store";

const NAV_ITEMS = [
  { href: "/dashboard/credenciales", label: "Correos y contraseñas" },
  { href: "/dashboard/claves", label: "Claves de proyectos" },
  { href: "/dashboard/configuracion", label: "Configuración y seguridad" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    clearVaultKey();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-vault-bg">
      <aside className="vault-texture flex w-64 shrink-0 flex-col border-r border-vault-border bg-vault-surface">
        <div className="rivet border-b border-vault-border px-6 py-6">
          <p className="font-display italic text-lg text-vault-gold">
            Bóveda
          </p>
          <p className="text-xs text-vault-dim">de credenciales</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-3 text-sm transition ${
                  active
                    ? "bg-vault-surface2 text-vault-gold"
                    : "text-vault-dim hover:bg-vault-surface2 hover:text-vault-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-3 rounded-lg border border-vault-border px-4 py-3 text-left text-sm text-vault-dim transition hover:border-vault-danger hover:text-vault-danger"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
