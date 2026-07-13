import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-vault-bg">
      {/* Texto de fondo gigante */}
      <h1
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center text-center font-display italic font-900 leading-[0.85] text-[18vw] text-vault-surface2/60 tracking-tight"
      >
        bóveda de
        <br />
        credenciales
      </h1>

      {/* Viñeta para que el texto no compita con el candado */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,22,26,0.2)_0%,rgba(20,22,26,0.92)_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <Link
          href="/login"
          aria-label="Ir al inicio de sesión"
          className="group relative flex h-52 w-52 items-center justify-center rounded-full border border-vault-gold/40 bg-vault-surface shadow-goldGlow transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-vault-gold/50 sm:h-64 sm:w-64"
        >
          <span className="absolute inset-0 rounded-full border border-vault-gold/10 transition-all duration-300 group-hover:border-vault-gold/30" />
          <LockIcon className="h-24 w-24 text-vault-gold transition-transform duration-300 group-hover:-rotate-6 sm:h-28 sm:w-28" />
        </Link>
        <p className="font-body text-sm uppercase tracking-[0.3em] text-vault-dim">
          Toca para desbloquear
        </p>
      </div>
    </main>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 16.5v2" />
    </svg>
  );
}
