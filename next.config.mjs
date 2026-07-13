/** @type {import('next').NextConfig} */

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' en style-src es necesario por los estilos que
  // inyecta Next.js/Tailwind en runtime; no relajamos script-src.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "img-src 'self' data: https://*.supabase.co",
  "font-src 'self' data:",
  // Solo permite conectar con tu propio proyecto de Supabase.
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Refuerza frame-ancestors: evita que la app se cargue dentro de
  // un <iframe> ajeno (protección anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el navegador intente "adivinar" tipos MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No compartas la URL de la app como referrer al salir a otro sitio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles del navegador que esta app no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Fuerza HTTPS en el navegador durante 2 años (actívalo solo si
  // ya sirves siempre por HTTPS, como en Vercel).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
