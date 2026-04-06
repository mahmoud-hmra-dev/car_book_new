# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BookCars is a car rental platform (monorepo) with: backend API, admin panel, customer frontend, mobile app, payment service, CLI tool, and MCP server. It supports multi-supplier mode, Stripe/PayPal payments, Traccar fleet tracking, and social login (Google, Facebook, Apple).

## Architecture

**Monorepo layout** - each app is independently built but shares types and helpers via `packages/`:

| Directory | Tech | Port | Purpose |
|-----------|------|------|---------|
| `backend/` | Express 5 + TypeScript + MongoDB (Mongoose) | 4002 | REST API, JWT auth, Stripe/PayPal, Nodemailer, Sentry |
| `admin/` | React 19 + Vite + MUI 7 + TypeScript | 3001 | Supplier/fleet/booking management panel |
| `frontend/` | React 19 + Vite + MUI 7 + TypeScript | 3002 | Customer-facing booking site |
| `mobile/` | React Native 0.83 + Expo 55 | 8082 | iOS/Android app (single codebase) |
| `payment/` | Laravel + MySQL | 8081 | Payment processing service |
| `mcp/` | Node.js + MCP SDK + TypeScript | 3100 | Model Context Protocol server for AI-driven admin ops |
| `cli/` | Node.js + Commander + TypeScript | - | CLI tool (`bookcars` command) |
| `packages/` | TypeScript libraries | - | Shared code (see below) |

**Shared packages** (referenced via TypeScript path aliases like `:bookcars-types`):
- `bookcars-types` - Shared TypeScript type definitions across all apps
- `bookcars-helper` - Utility functions for frontend/mobile
- `currency-converter` - Currency conversion utilities
- `reactjs-social-login` - Social auth components
- `disable-react-devtools` - Production devtools disabler

**Database**: MongoDB (primary), PostgreSQL (Traccar), MySQL (payment service).

## Common Commands

### Root level
```bash
npm run lint                    # ESLint across root JS files
npm run pre-commit              # Pre-commit hook validation
```

### Backend
```bash
cd backend
npm run dev                     # Dev server with nodemon
npm run dev:setup               # Dev + database setup
npm run build                   # TypeScript + Babel compile
npm run start                   # Build + run production
npm run test                    # Jest with coverage
npm run lint                    # ESLint
npm run setup                   # Initialize database
npm run reset                   # Reset database
npm run seed:demo               # Seed demo data
```

### Admin / Frontend (same pattern)
```bash
cd admin  # or cd frontend
npm run install:dependencies    # Install shared packages first
npm run dev                     # Vite dev server
npm run build                   # Production build
npm run lint                    # ESLint
npm run stylelint               # CSS linting
```

### Mobile
```bash
cd mobile
npm run install:dependencies    # Install shared packages first
npm run start                   # Expo dev server
npm run start:clean             # Expo with cache clear
npm run android                 # Android build
npm run ios                     # iOS build
```

### CLI / MCP
```bash
cd cli  # or cd mcp
npm run build                   # TypeScript compile
npm run dev                     # Watch mode
npm run start                   # Run
```

### Docker
```bash
docker compose up -d                                    # Full production stack
docker compose -f docker-compose.dev.yml up -d          # Development with hot reload
```

## Key Conventions

- **TypeScript everywhere** with strict type checking; shared types live in `packages/bookcars-types`
- **Path aliases**: Apps use `:bookcars-types`, `:bookcars-helper`, etc. (configured in tsconfig.json per app) and `@/*` for local src imports
- **ESLint**: Flat config format; semicolons off (`semi: never`), single quotes enforced
- **Pre-commit hooks**: Husky + custom `pre-commit.js` validates across the monorepo
- **Build shared packages first**: Run `npm run install:dependencies` then `npm run ts:build` in admin/frontend/mobile before first dev run
- **Environment files**: Each app has `.env.example`; Docker uses `.env.docker` variants
- **Backend env**: `backend/.env.example` has ~111 config keys (DB, auth, payments, SMTP, CDN, Sentry, Traccar)

## MCP Integration

The MCP server (`mcp/`) exposes BookCars admin operations to AI assistants. Configured in `.mcp.json` at repo root. The `bookcars` MCP server tools provide direct access to CRUD operations for cars, bookings, users, suppliers, locations, countries, notifications, settings, and Traccar fleet tracking.

## Docker Services

Production (`docker-compose.yml`): mongo (27018), mongo-express (8084), traccar (8382), traccar-db (5433), bc-backend (4002), bc-admin (3001), bc-frontend (8088), mysql_payment (3388), payment (8081), bc-mcp (3100).

Dev (`docker-compose.dev.yml`): Same databases + hot-reload containers with volume mounts for backend/admin/frontend.
