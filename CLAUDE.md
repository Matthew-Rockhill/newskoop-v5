# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Newskoop is a newsroom content management system built with Next.js 15, supporting multi-language content creation, editorial workflows, and radio station content distribution. The system handles stories, bulletins, translations, and provides role-based access control for staff and radio users.

## Common Commands

### Development
```bash
npm run dev                 # Start development server on localhost:3000
npm run build              # Build for production (includes Prisma generate)
npm start                  # Start production server
npm run lint               # Run ESLint
```

### Database
```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run migrations in development
npx prisma migrate deploy  # Deploy migrations (production)
npm run seed               # Seed database with development data
npm run seed:production    # Seed production users
```

### Testing
```bash
npm test                   # Run unit tests (143 tests, fast, no DB required)
npm run test:watch         # Run unit tests in watch mode
npm run test:integration   # Run integration tests (requires dev database)
npm run test:all           # Run both unit + integration tests
npm run test:json          # Unit tests with JSON output (used by SUPERADMIN panel)
```

### Deployment
```bash
npm run vercel-build       # Vercel build command (runs migrations + build)
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Neon hosted)
- **Authentication**: NextAuth.js with JWT sessions
- **Email**: Resend/SendGrid (environment-dependent)
- **File Storage**: Vercel Blob
- **UI**: React 19, Tailwind CSS, Headless UI, Framer Motion
- **Rich Text**: TipTap editor

### User Types & Roles

**STAFF Users** (Newsroom):
- `SUPERADMIN`: Full system access
- `ADMIN`: Administrative access
- `EDITOR`: Full editorial control, can delete/archive
- `SUB_EDITOR`: Can approve stories and translations, publish content
- `JOURNALIST`: Can review intern stories, submit for approval
- `INTERN`: Can create drafts, submit for review

**RADIO Users**: Radio stations accessing approved content with filtering by language, religion, and locality.

### Authentication Flow

Authentication is handled by NextAuth.js (`src/lib/auth.ts`). The system uses:
- JWT-based sessions (no database sessions)
- Credential-based login with bcrypt password hashing
- Magic link authentication for new user onboarding
- Password reset tokens with expiry
- Audit logging for all login events

Middleware (`src/middleware.ts`) enforces:
- Public paths: `/`, `/login`, `/password-reset`, `/auth/set-password`, `/dashboard`
- Staff-only: `/admin`, `/newsroom`
- Role-based access within protected routes

### Editorial Workflow

**Story Statuses** (sequential flow):
1. `DRAFT` → Initial creation
2. `IN_REVIEW` → Under tier 1 review (journalist reviews intern work)
3. `NEEDS_REVISION` → Sent back for corrections
4. `PENDING_APPROVAL` → Awaiting tier 2 approval (editor/sub-editor)
5. `APPROVED` → Approved, pending translation/publishing
6. `PENDING_TRANSLATION` → Translation requested
7. `READY_TO_PUBLISH` → Ready for publication
8. `PUBLISHED` → Published to radio stations
9. `ARCHIVED` → Archived content

**Permission System** (`src/lib/permissions.ts`):
- Each role has specific allowed status transitions
- Stories locked during review/approval (cannot be edited)
- `NEEDS_REVISION` stories editable only by original author
- Interns can only edit their own stories
- Sub-editors and above can edit any story in editable states

### Translation Workflow

**Translation Statuses**:
- `PENDING` → Request created
- `IN_PROGRESS` → Translator working
- `NEEDS_REVIEW` → Submitted for review
- `APPROVED` → Translation approved
- `REJECTED` → Sent back for corrections
- `PUBLISHED` → Translation published

**StoryGroup Model**: Links original story with translations for coordinated publishing.

### Database Architecture

**Core Models** (see `prisma/schema.prisma`):
- `User`: Unified model for STAFF and RADIO users
- `Station`: Radio station configuration with content filtering
- `Story`: Main content entity with language variants
- `Category`: Hierarchical (parent → sub → sub-sub, max 3 levels)
- `Tag`: Four categories: LANGUAGE, RELIGION, LOCALITY, GENERAL
- `AudioClip`: Story audio files stored in Vercel Blob
- `Comment`: Nested comments with revision tracking
- `Translation`: Translation workflow tracking
- `Bulletin`: News bulletin creation and scheduling
- `Announcement`: System announcements
- `EmailLog`: Email tracking and audit trail
- `AuditLog`: User action tracking

**Key Relationships**:
- Stories have multiple translations via `StoryGroup`
- Stories can have `originalStoryId` for translation linking
- Users have role-specific relationships (authoredStories, reviewedStories, etc.)
- Stations filter content by language, religion, and blocked categories

### API Structure

API routes follow Next.js 15 App Router conventions in `src/app/api/`:
- `/api/auth/*` - NextAuth endpoints
- `/api/admin/*` - Admin management (users, stations, categories, tags)
- `/api/newsroom/*` - Story management, translations, bulletins
- `/api/radio/*` - Radio station content access
- `/api/analytics/*` - Usage analytics

**API Helpers** (`src/lib/api-handler.ts`): Provides standardized error handling and response formatting.

### Environment Configuration

The project uses environment-specific configurations (see `ENVIRONMENT_SETUP.md`):

**Development** (`.env.local`):
- Local Neon database branch
- `EMAIL_MODE=console` (logs to terminal)
- `NEXTAUTH_URL=http://localhost:3000`

**Production** (Vercel):
- Production Neon database
- `EMAIL_MODE=resend` (full email)
- `NEXTAUTH_URL=https://newskoop.vercel.app`
- Deployed from `main` branch

### Email System

Email handling (`src/lib/email.ts`, `src/lib/email-config.ts`):
- Console mode for development (logs to terminal)
- Full mode for production
- All emails logged to `EmailLog` table
- Magic links for user onboarding
- Password reset tokens

### File Upload

Audio file handling (`src/lib/file-upload.ts`, `src/lib/vercel-blob.ts`):
- Uploaded to Vercel Blob storage
- Stored in `AudioClip` model with metadata
- Supported formats defined in upload handler
- 10MB server action body size limit (see `next.config.ts`)

### TypeScript Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `./src/*`
- `@/newsroom/*` → `./src/components/newsroom/*`
- `@/admin/*` → `./src/components/admin/*`
- `@/ui/*` → `./src/components/ui/*`

### Component Organization

- `src/components/ui/` - Reusable UI components (buttons, inputs, modals)
- `src/components/newsroom/` - Newsroom-specific components
- `src/components/admin/` - Admin panel components
- `src/components/radio/` - Radio station interface components
- `src/components/shared/` - Shared components across modules
- `src/components/layout/` - Layout components (headers, navigation)

### Testing Architecture

**Framework**: Vitest with separate configs for unit and integration tests.

**Unit Tests** (`src/lib/__tests__/*.test.ts`):
- Pure logic tests — permissions, validations, slug generation, email config, language utils
- No database required, fast (~1s total)
- Run via `npm test`
- Config: `vitest.config.ts`

**Integration Tests** (`src/lib/__tests__/integration/*.test.ts`):
- Prisma-level tests against the real dev database
- Verify modules work together: station content filtering queries, editorial stage transitions with DB records, translation auto-advancement and publish cascade
- All test entities prefixed with `__test__` and use `@test.newskoop.internal` emails
- Each file uses a unique suffix (`sf`, `ef`, `tc`) to avoid collisions
- Cleanup runs in both `beforeAll` (clearing leftovers) and `afterAll`
- Run via `npm run test:integration`
- Config: `vitest.integration.config.ts` (30s timeout)

**Test Helpers** (`src/lib/__tests__/integration/test-helpers.ts`):
- `createTestUser(role, suffix)` — creates a staff user
- `createTestCategory(name, suffix)` — creates a category
- `createTestClassification(name, type, suffix)` — creates a language/religion/locality classification
- `createTestStory(opts)` — creates a story with classifications via join table
- `createTestStation(opts)` — creates a station with content filters
- `cleanupTestData(suffix)` — deletes all test entities in FK-safe order

**SUPERADMIN Panel**: The function tests UI at `/admin/super` runs unit tests via `POST /api/admin/super/function-tests` and displays results grouped by module.

### Key Features

**Review Checklist**: JSON-based checklist stored on Story and Bulletin models for tracking review completion.

**Follow-up System**: Stories can have follow-up dates for editorial tracking.

**Scheduled Publishing**: Stories and bulletins support scheduled publication.

**Bulletin System**: Radio bulletins with intro/outro, scheduled time slots (weekday/weekend/holiday), and story ordering.

**Content Filtering**: Radio stations can filter by languages, religions, and block specific categories.

**Audit Trail**: All user actions logged to `AuditLog` table.

## Important Patterns

### Server Actions
Use `src/lib/api-handler.ts` for consistent error handling in server actions.

### Database Queries
Always use Prisma client from `src/lib/prisma.ts` (singleton pattern).

### Authentication Checks
Use `getServerSession(authOptions)` in server components and API routes.

### Permission Checks
Import and use permission helpers from `src/lib/permissions.ts` before allowing operations.

### Email Sending
Use helpers from `src/lib/email.ts` which automatically handle environment-specific behavior and logging.

## Deployment Workflow

1. Feature development on feature branches → creates Vercel preview
2. Merge to `main` branch → deploys to production

Migrations are automatically run via `vercel-build` script (see `vercel.json`).
