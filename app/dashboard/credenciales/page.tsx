"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVaultKey } from "@/lib/vault-key-store";
import { encryptField, decryptField } from "@/lib/crypto";

type Credential = {
  id: string;
  network: string;
  email: string;
  password_ciphertext: string;
  password_iv: string;
};

export default function CredencialesPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Credential[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [network, setNetwork] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("credentials")
      .select("id, network, email, password_ciphertext, password_iv")
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
    const { ciphertext, iv } = await encryptField(key, password);

    await supabase.from("credentials").insert({
      user_id: userData.user?.id,
      network,
      email,
      password_ciphertext: ciphertext,
      password_iv: iv,
    });

    setNetwork("");
    setEmail("");
    setPassword("");
    setSaving(false);
    load();
  }

  async function handleReveal(item: Credential) {
    const key = getVaultKey();
    if (!key) {
      alert("Tu sesión de cifrado expiró, vuelve a iniciar sesión.");
      return;
    }
    const plain = await decryptField(
      key,
      item.password_ciphertext,
      item.password_iv
    );
    setRevealed((prev) => ({ ...prev, [item.id]: plain }));
  }

  async function handleDelete(id: string) {
    await supabase.from("credentials").delete().eq("id", id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 font-display text-2xl italic text-vault-text">
        Correos y contraseñas
      </h2>
      <p className="mb-8 text-sm text-vault-dim">
        Guarda tus cuentas identificadas por red social, correo o servicio.
      </p>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-vault-border bg-vault-surface p-5 sm:grid-cols-3"
      >
        <input
          required
          placeholder="Red (ej. Instagram, Gmail)"
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
        />
        <input
          required
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
        />
        <input
          required
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
        />
        <button
          type="submit"
          disabled={saving}
          className="col-span-full rounded-lg bg-vault-gold py-2 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Agregar cuenta"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-vault-border bg-vault-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-vault-text">
                {item.network}
              </p>
              <p className="truncate text-xs text-vault-dim">{item.email}</p>
              {revealed[item.id] && (
                <p className="mt-1 font-mono text-xs text-vault-gold">
                  {revealed[item.id]}
                </p>
              )}
            </div>
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
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-vault-dim">
            Aún no has guardado ninguna cuenta.
          </p>
        )}
      </ul>
    </div>
  );
}
