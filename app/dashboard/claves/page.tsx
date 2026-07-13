"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVaultKey } from "@/lib/vault-key-store";
import { encryptField, decryptField } from "@/lib/crypto";

type ProjectKeys = {
  id: string;
  project_name: string;
  db_password_ciphertext: string | null;
  db_password_iv: string | null;
  anon_key_ciphertext: string | null;
  anon_key_iv: string | null;
  service_role_key_ciphertext: string | null;
  service_role_key_iv: string | null;
};

export default function ClavesPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ProjectKeys[]>([]);
  const [revealed, setRevealed] = useState<Record<string, Record<string, string>>>({});

  const [projectName, setProjectName] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("project_keys")
      .select(
        "id, project_name, db_password_ciphertext, db_password_iv, anon_key_ciphertext, anon_key_iv, service_role_key_ciphertext, service_role_key_iv"
      )
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const key = getVaultKey();
    if (!key) {
      alert("Tu sesión de cifrado expiró, vuelve a iniciar sesión.");
      return;
    }
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();

    const db = dbPassword ? await encryptField(key, dbPassword) : null;
    const anon = anonKey ? await encryptField(key, anonKey) : null;
    const service = serviceRoleKey
      ? await encryptField(key, serviceRoleKey)
      : null;

    await supabase.from("project_keys").insert({
      user_id: userData.user?.id,
      project_name: projectName,
      db_password_ciphertext: db?.ciphertext ?? null,
      db_password_iv: db?.iv ?? null,
      anon_key_ciphertext: anon?.ciphertext ?? null,
      anon_key_iv: anon?.iv ?? null,
      service_role_key_ciphertext: service?.ciphertext ?? null,
      service_role_key_iv: service?.iv ?? null,
    });

    setProjectName("");
    setDbPassword("");
    setAnonKey("");
    setServiceRoleKey("");
    setSaving(false);
    load();
  }

  async function handleReveal(item: ProjectKeys) {
    const key = getVaultKey();
    if (!key) {
      alert("Tu sesión de cifrado expiró, vuelve a iniciar sesión.");
      return;
    }
    const out: Record<string, string> = {};
    if (item.db_password_ciphertext && item.db_password_iv) {
      out.db = await decryptField(
        key,
        item.db_password_ciphertext,
        item.db_password_iv
      );
    }
    if (item.anon_key_ciphertext && item.anon_key_iv) {
      out.anon = await decryptField(
        key,
        item.anon_key_ciphertext,
        item.anon_key_iv
      );
    }
    if (item.service_role_key_ciphertext && item.service_role_key_iv) {
      out.service = await decryptField(
        key,
        item.service_role_key_ciphertext,
        item.service_role_key_iv
      );
    }
    setRevealed((prev) => ({ ...prev, [item.id]: out }));
  }

  async function handleDelete(id: string) {
    await supabase.from("project_keys").delete().eq("id", id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 font-display text-2xl italic text-vault-text">
        Claves de proyectos
      </h2>
      <p className="mb-8 text-sm text-vault-dim">
        Guarda la contraseña de la base de datos y las llaves de cada
        proyecto de Supabase (las mismas que conectas a Vercel).
      </p>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-vault-border bg-vault-surface p-5"
      >
        <input
          required
          placeholder="Nombre del proyecto"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
        />
        <input
          type="password"
          placeholder="Contraseña de la base de datos"
          value={dbPassword}
          onChange={(e) => setDbPassword(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
        />
        <input
          type="password"
          placeholder="anon / public key"
          value={anonKey}
          onChange={(e) => setAnonKey(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 font-mono text-sm outline-none focus:border-vault-gold"
        />
        <input
          type="password"
          placeholder="service_role key"
          value={serviceRoleKey}
          onChange={(e) => setServiceRoleKey(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 font-mono text-sm outline-none focus:border-vault-gold"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-vault-gold py-2 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Agregar proyecto"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-vault-border bg-vault-surface px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-vault-text">
                {item.project_name}
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleReveal(item)}
                  className="rounded-md border border-vault-border px-3 py-1.5 text-xs text-vault-dim hover:text-vault-text"
                >
                  Ver
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-md border border-vault-border px-3 py-1.5 text-xs text-vault-dim hover:border-vault-danger hover:text-vault-danger"
                >
                  Eliminar
                </button>
              </div>
            </div>
            {revealed[item.id] && (
              <div className="mt-2 space-y-1 font-mono text-xs text-vault-gold">
                {revealed[item.id].db && <p>DB: {revealed[item.id].db}</p>}
                {revealed[item.id].anon && (
                  <p>anon: {revealed[item.id].anon}</p>
                )}
                {revealed[item.id].service && (
                  <p>service_role: {revealed[item.id].service}</p>
                )}
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-vault-dim">
            Aún no has guardado ningún proyecto.
          </p>
        )}
      </ul>
    </div>
  );
}
