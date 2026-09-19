# Juntealo

Aplicación web para crear y administrar juntas de ahorro digitales. Incluye
autenticación, pagos, turnos, notificaciones, ranking, referidos y un panel de
administración.

## Tecnologías

- Next.js 14 con App Router
- React 18 y TypeScript
- Tailwind CSS
- Supabase (autenticación, base de datos y almacenamiento)
- Resend y React Email
- Zustand
- Vitest

## Requisitos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase

## Instalación local

```bash
git clone <URL_DEL_REPOSITORIO>
cd Juntaz
npm install
cp .env.example .env.local
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno

Completa `.env.local` usando `.env.example` como referencia.

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_PAYMENT_RECEIPTS_BUCKET` | Bucket de comprobantes de pago |
| `NEXT_PUBLIC_ENABLE_MOCKS` | Activa datos simulados en desarrollo |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Correos administradores para mock/local, separados por comas |
| `NEXT_PUBLIC_APP_URL` | URL pública usada en enlaces y correos |
| `RESEND_API_KEY` | Clave privada de Resend |
| `RESEND_WEBHOOK_SECRET` | Secreto para validar el webhook de Resend |
| `EMAIL_FROM` | Remitente verificado de los correos |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada para procesos del servidor |

`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` se
mantienen únicamente por compatibilidad con configuraciones anteriores.

Nunca expongas `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` ni
`SUPABASE_SERVICE_ROLE_KEY` en variables con el prefijo `NEXT_PUBLIC_`.

## Estructura del proyecto

```text
Juntaz/
├── app/                    # Rutas, layouts y endpoints de Next.js
│   ├── (admin)/            # Backoffice
│   ├── (app)/              # Zona privada del usuario
│   ├── (auth)/             # Autenticación
│   ├── (public)/           # Sitio público
│   └── api/                # Route handlers y webhooks
├── components/             # Componentes visuales reutilizables
│   ├── account/            # Cuenta y preferencias
│   ├── emails/             # Plantillas de correo
│   ├── landing/            # Secciones de marketing
│   ├── layout/             # Estructura visual de la app
│   └── ui/                 # Componentes base
├── features/               # Esquemas y piezas por dominio
├── hooks/                  # Hooks compartidos
├── lib/                    # Utilidades y reglas de negocio puras
├── services/               # Acceso a datos y casos de uso
├── store/                  # Estado global con Zustand
├── types/                  # Tipos de dominio compartidos
├── supabase/
│   ├── migrations/         # Migraciones SQL ordenadas
│   ├── seed/               # Datos iniciales
│   ├── tests/              # Contratos SQL
│   └── analytics/          # Consultas de analítica
├── docs/                   # Documentación y recursos de apoyo
└── public/                 # Recursos públicos de la aplicación
```

Los tests unitarios viven junto al área que validan, dentro de carpetas
`__tests__`. El alias `@/` apunta a la raíz del repositorio.

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm run build          # build de producción
npm run start          # ejecuta el build
npm run typecheck      # valida TypeScript
npm run lint           # ejecuta ESLint
npm test               # ejecuta los tests una vez
npm run test:watch     # tests en modo interactivo
npm run test:coverage  # reporte de cobertura
```

## Base de datos

Las migraciones están numeradas en `supabase/migrations` y deben aplicarse en
orden. Para un entorno local administrado con Supabase CLI:

```bash
npx supabase start
npx supabase db reset
```

`db reset` recrea la base local, aplica todas las migraciones y carga el seed.
No lo ejecutes contra una base con datos que necesites conservar.

La zona horaria de las reglas de negocio es `America/Lima`. En particular, una
junta en borrador queda bloqueada cuando su fecha de inicio ya pasó.

## Correos transaccionales

Los recordatorios crean primero una notificación interna y luego intentan enviar
un correo. Configura en Resend el webhook:

```text
https://TU_DOMINIO/api/webhooks/resend
```

Eventos esperados: `email.sent`, `email.delivered`,
`email.delivery_delayed`, `email.bounced`, `email.complained` y `email.failed`.

## Documentación adicional

- [Eventos de analítica de producto](docs/product-analytics-events.md)
- Las capturas de referencia están en `docs/assets/screenshots`.
