"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasPinConfigured, unlockWithPin, pinLockRemainingMs, pinAttemptsLeft } from "@/lib/pin";
import { deriveMasterKey } from "@/lib/crypto";
import { setVaultKey } from "@/lib/vault-key-store";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"password" | "pin" | "signup">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasPinConfigured()) setMode("pin");
  }, []);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("master_salt")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (!profile) {
      setError("No se encontró el perfil de esta cuenta.");
      return;
    }

    const key = await deriveMasterKey(password, profile.master_salt);
    setVaultKey(key);
    router.push("/dashboard");
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const remaining = pinLockRemainingMs();
    if (remaining > 0) {
      setError(
        `Demasiados intentos. Espera ${Math.ceil(remaining / 1000)}s antes de volver a intentar.`
      );
      return;
    }

    setLoading(true);
    const key = await unlockWithPin(pin);
    setLoading(false);

    if (!key) {
      if (!hasPinConfigured()) {
        // Se agotaron los intentos: el PIN se borró de este
        // dispositivo, hay que volver a entrar con la contraseña.
        setError(
          "Demasiados intentos fallidos. El PIN de este dispositivo fue borrado por seguridad, usa tu contraseña maestra."
        );
        setMode("password");
        setPin("");
        return;
      }
      setError(`PIN incorrecto. Te quedan ${pinAttemptsLeft()} intento(s).`);
      return;
    }
    // El PIN solo desenvuelve la llave maestra en este dispositivo;
    // la sesión de Supabase (cookies) debe seguir activa para que
    // esto funcione. Si expiró, se pide la contraseña maestra de nuevo.
    setVaultKey(key);
    router.push("/dashboard");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError("No se pudo crear la cuenta.");
      return;
    }
    setMode("password");
    setError(null);
    alert("Cuenta creada. Revisa tu correo si se pide confirmación, luego inicia sesión.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-vault-bg px-4">
      <div className="vault-texture w-full max-w-sm rounded-2xl border border-vault-border bg-vault-surface p-8 shadow-goldGlow">
        <h1 className="mb-1 text-center font-display text-2xl italic text-vault-text">
          Bóveda de credenciales
        </h1>
        <p className="mb-6 text-center text-sm text-vault-dim">
          {mode === "pin" && "Ingresa tu PIN"}
          {mode === "password" && "Ingresa tu contraseña maestra"}
          {mode === "signup" && "Crea tu cuenta"}
        </p>

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-vault-border bg-vault-surface2 px-4 py-3 text-sm text-vault-text outline-none focus:border-vault-gold"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Contraseña maestra (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-vault-border bg-vault-surface2 px-4 py-3 text-sm text-vault-text outline-none focus:border-vault-gold"
            />
            {error && <p className="text-sm text-vault-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-vault-gold py-3 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim disabled:opacity-60"
            >
              {loading ? "Creando…" : "Crear cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setMode("password")}
              className="text-xs text-vault-dim underline underline-offset-2"
            >
              Ya tengo cuenta
            </button>
          </form>
        )}

        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-vault-border bg-vault-surface2 px-4 py-3 text-sm text-vault-text outline-none focus:border-vault-gold"
            />
            <input
              type="password"
              required
              placeholder="Contraseña maestra"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-vault-border bg-vault-surface2 px-4 py-3 text-sm text-vault-text outline-none focus:border-vault-gold"
            />
            {error && <p className="text-sm text-vault-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-vault-gold py-3 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Desbloquear"}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-xs text-vault-dim underline underline-offset-2"
            >
              Crear una cuenta
            </button>
          </form>
        )}

        {mode === "pin" && (
          <form onSubmit={handlePinLogin} className="flex flex-col gap-4">
            <input
              type="password"
              inputMode="numeric"
              required
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="rounded-lg border border-vault-border bg-vault-surface2 px-4 py-3 text-center text-lg tracking-[0.5em] text-vault-text outline-none focus:border-vault-gold"
            />
            {error && <p className="text-sm text-vault-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-vault-gold py-3 text-sm font-semibold text-vault-bg transition hover:bg-vault-goldDim disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Desbloquear"}
            </button>
            <button
              type="button"
              onClick={() => setMode("password")}
              className="text-xs text-vault-dim underline underline-offset-2"
            >
              Usar contraseña maestra en su lugar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
