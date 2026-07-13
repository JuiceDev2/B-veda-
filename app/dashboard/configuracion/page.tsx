"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toWebpAvatar } from "@/lib/image";
import { getVaultKey } from "@/lib/vault-key-store";
import { setupPin, hasPinConfigured, clearPin } from "@/lib/pin";

export default function ConfiguracionPage() {
  const supabase = createClient();

  const [uploading, setUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const pinAlreadySet =
    typeof window !== "undefined" && hasPinConfigured();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAvatarMsg(null);

    try {
      const webpBlob = await toWebpAvatar(file);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sin sesión");

      const path = `${userId}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, webpBlob, {
          contentType: "image/webp",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", userId);

      setAvatarMsg("Imagen actualizada.");
    } catch {
      setAvatarMsg("No se pudo actualizar la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg(null);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      setResetMsg("No se pudo restablecer la contraseña.");
      return;
    }
    setResetMsg(
      "Contraseña actualizada. Nota: si tenías un PIN configurado, vuelve a configurarlo."
    );
    setNewPassword("");
    clearPin();
  }

  async function handleSetupPin(e: React.FormEvent) {
    e.preventDefault();
    setPinMsg(null);

    if (pin.length < 6) {
      setPinMsg("El PIN debe tener al menos 6 dígitos.");
      return;
    }
    if (pin !== pinConfirm) {
      setPinMsg("Los PIN no coinciden.");
      return;
    }

    const key = getVaultKey();
    if (!key) {
      setPinMsg(
        "Necesitas haber iniciado sesión con tu contraseña maestra en esta sesión para poder activar el PIN."
      );
      return;
    }

    await setupPin(pin, key);
    setPinMsg("PIN activado en este dispositivo.");
    setPin("");
    setPinConfirm("");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <h2 className="font-display text-2xl italic text-vault-text">
        Configuración y seguridad
      </h2>

      {/* Avatar */}
      <section className="rounded-xl border border-vault-border bg-vault-surface p-5">
        <h3 className="mb-2 text-sm font-semibold text-vault-text">
          Imagen de perfil
        </h3>
        <p className="mb-3 text-xs text-vault-dim">
          Se convierte automáticamente a WebP ligero antes de guardarse.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          disabled={uploading}
          className="text-sm text-vault-dim"
        />
        {avatarMsg && (
          <p className="mt-2 text-xs text-vault-gold">{avatarMsg}</p>
        )}
      </section>

      {/* Restablecer contraseña */}
      <section className="rounded-xl border border-vault-border bg-vault-surface p-5">
        <h3 className="mb-2 text-sm font-semibold text-vault-text">
          Restablecer contraseña maestra
        </h3>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={8}
            placeholder="Nueva contraseña maestra"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-vault-gold px-4 py-2 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim"
          >
            Actualizar contraseña
          </button>
          {resetMsg && <p className="text-xs text-vault-dim">{resetMsg}</p>}
        </form>
      </section>

      {/* PIN */}
      <section className="rounded-xl border border-vault-border bg-vault-surface p-5">
        <h3 className="mb-2 text-sm font-semibold text-vault-text">
          Desbloqueo rápido con PIN
        </h3>
        <p className="mb-3 text-xs text-vault-dim">
          Requiere tener una contraseña maestra configurada. El PIN solo
          funciona en este dispositivo, igual que en Android.
        </p>
        <form onSubmit={handleSetupPin} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Nuevo PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirmar PIN"
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value)}
            className="rounded-lg border border-vault-border bg-vault-surface2 px-3 py-2 text-sm outline-none focus:border-vault-gold"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-vault-gold px-4 py-2 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim"
          >
            {pinAlreadySet ? "Actualizar PIN" : "Activar PIN"}
          </button>
          {pinMsg && <p className="text-xs text-vault-dim">{pinMsg}</p>}
        </form>
      </section>
    </div>
  );
}
