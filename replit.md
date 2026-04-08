# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## IPTV Project — ANGEL TV Pro

**Xtream Credentials**: `http://barqtv.art:80`, user: `Angelfor4u`, pass: `1122331100`

**Latest APK build**: `ab903163-fc4a-429e-9dbf-048ce1a31f17` (EAS) — built 2026-04-06
- APK path: `artifacts/iptv-app/public/iptv-tv.apk` (94MB)
- Download link: `tinyurl.com/274rvbob`
- EAS account: `hanieuejusj` (yuu32040@gmail.com)
- Project ID: `f1bccccc-7877-4be9-86a1-e4ad6c2cdf1c`

**Features in latest APK**:
- Color themes (gold/blue/red/purple) with live preview
- Cinematic splash animation (ANGEL TV pro spring scale)
- Skip Intro button (first 120s of content)
- Mood picker (5 moods → filtered genre content)
- Smart recommendations from watch history
- Smart rating "ستحبه بنسبة X%"
- Voice search mic button
- Family voting screen (👨‍👩‍👧)
- Live channel proxy fix (x-forwarded-host)

**Admin panel**: `.../iptv-app/admin`, password: `angeltvpro2026`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
