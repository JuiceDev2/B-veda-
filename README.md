# Bóveda de credenciales

Gestor personal de contraseñas: cuentas/redes sociales y claves de
proyectos de Supabase. Cifrado **zero-knowledge**: la contraseña
maestra nunca sale de tu navegador, ni siquiera Supabase puede leer
tus contraseñas guardadas.

## Cómo está armado

- **Next.js 14 (App Router) + TypeScript + Tailwind**
- **Supabase**: autenticación (email/contraseña), Postgres con Row
  Level Security, Storage para el avatar
- **Cifrado**: `lib/crypto.ts` deriva una llave AES-256 con PBKDF2 a
  partir de tu contraseña maestra + un salt guardado en tu perfil.
  Cada contraseña/llave se cifra en el navegador antes de enviarse
  a la base de datos.
- **PIN**: `lib/pin.ts` envuelve esa llave con tu PIN y la guarda
  solo en `localStorage` de este navegador (nunca en el servidor).

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`.
   Esto crea las tablas `profiles`, `credentials`, `project_keys`,
   el bucket `avatars` y el trigger que genera el salt de cada
   usuario nuevo automáticamente.
3. Copia `.env.example` a `.env.local` y llena las dos variables con
   los datos de **Project Settings → API** de tu proyecto Supabase.
4. Instala dependencias y corre en local:
   ```bash
   npm install
   npm run dev
   ```
5. Entra a `http://localhost:3000`, toca el candado, y usa
   "Crear una cuenta" para tu primer registro.

## Desplegar en Vercel

1. Sube este proyecto a un repo de GitHub.
2. Impórtalo en [vercel.com](https://vercel.com).
3. Agrega las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en **Project Settings →
   Environment Variables**.
4. Deploy.

## Notas importantes de seguridad

- Si restableces tu contraseña maestra, la llave de cifrado cambia,
  así que las credenciales guardadas con la llave anterior no se
  podrán volver a descifrar con la nueva. En una v2 conviene agregar
  un flujo de "re-cifrar todo" antes de cambiar la contraseña.
- El PIN es solo un atajo local: si entras desde otro dispositivo o
  borras los datos del navegador, necesitas tu contraseña maestra.
  Tras 5 intentos fallidos (con espera progresiva entre cada uno),
  el PIN se borra automáticamente de este dispositivo por seguridad.
- `next.config.mjs` ya incluye cabeceras de seguridad: Content-Security-Policy,
  `X-Frame-Options: DENY` (anti-clickjacking), `X-Content-Type-Options`,
  `Referrer-Policy` y `Strict-Transport-Security`. Si agregas un
  dominio externo (por ejemplo para imágenes), recuerda sumarlo al CSP.
- Revisa y ajusta las políticas de Row Level Security en
  `supabase/schema.sql` antes de ir a producción.
- Activa Rate Limits y, si quieres, CAPTCHA en Authentication →
  Settings de tu proyecto Supabase para frenar fuerza bruta contra
  el login con contraseña.

## Estructura

```
app/
  page.tsx                  → pantalla principal (candado gigante)
  login/page.tsx             → login / PIN / registro
  dashboard/
    layout.tsx                → panel lateral izquierdo
    credenciales/page.tsx      → correos y contraseñas por red
    claves/page.tsx            → claves de proyectos Supabase
    configuracion/page.tsx     → avatar, restablecer contraseña, PIN
lib/
  crypto.ts     → cifrado AES-GCM + derivación PBKDF2
  pin.ts        → desbloqueo rápido con PIN
  image.ts      → conversión de avatar a WebP
  vault-key-store.ts → llave maestra en memoria durante la sesión
supabase/
  schema.sql    → tablas, RLS, trigger, bucket de avatares
```
