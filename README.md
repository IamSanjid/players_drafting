# Players Drafting

Draft management app built with Next.js App Router + Prisma.

## Setup

1. Install dependencies.
```bash
npm install
```

2. Create env file from template.
```bash
copy .env.example .env
```

3. Update secrets in `.env`:
- `AUTH_SECRET`: long random string used to sign auth cookies.
- `ADMIN_PASSWORD`: admin login password for `/admin`.
- `ADMIN_PASSWORD_HASH`: optional bcrypt hash; if set, it takes precedence over `ADMIN_PASSWORD`.
- `NEXT_PUBLIC_TITLE`: optional site title.
- `NEXT_PUBLIC_DESCRIPTION`: optional site description.

You can generate an admin hash with Node:
```bash
node -e "const b=require('bcryptjs'); b.hash(process.argv[1],10).then(h=>console.log(h))" "your-admin-password"
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Authentication and Authorization

This project now uses stateless signed cookie sessions (`jose`) and server-side route checks.

- `GET` APIs are public.
- Most `POST`/`PATCH`/`DELETE` APIs are admin-only.
- Team writes are restricted to `POST /api/draft/pick` and must match the authenticated team.
- `proxy.ts` adds an optimistic pre-check for API write requests (`/api/:path*`). Route handlers still perform authoritative checks.
- `proxy.ts` also validates browser `Origin` on unsafe API methods as a CSRF mitigation.

Write policy is centralized in `src/lib/auth/policy.ts` to make future team-write route additions easy.
Token signing/verification is centralized in `src/lib/auth/token.ts` and reused by both route handlers and `proxy.ts`.

Team passwords:
- New/updated team passwords are stored as bcrypt hashes.
- Existing plaintext team rows still authenticate for backward compatibility until you rotate/update them.

To hash all existing plaintext team passwords once:
```bash
npx tsx scripts/hash-team-passwords.ts
```

### Public APIs

- `GET /api/players`
- `GET /api/teams`
- `GET /api/draft/session`

### Team-Allowed Write APIs

- `POST /api/draft/pick`

### Admin-Only Write APIs

- `PATCH /api/draft/session`
- `POST /api/teams`
- `PATCH /api/teams/[id]`
- `DELETE /api/teams/[id]`
- `POST /api/teams/reverse`
- `POST /api/players`
- `PATCH /api/players/[id]`
- `DELETE /api/players/[id]`
- `POST /api/players/[id]/assign`
- `POST /api/players/bulk`
- `DELETE /api/players/bulk`
- `POST /api/upload`

## Auth Endpoints

- Admin:
	- `POST /api/auth/admin/login`
	- `POST /api/auth/admin/logout`
	- `GET /api/auth/admin/me`
- Team:
	- `POST /api/auth/team/login`
	- `POST /api/auth/team/logout`
	- `GET /api/auth/team/me`

## Validation

```bash
npm run lint
npx tsc --noEmit
```
