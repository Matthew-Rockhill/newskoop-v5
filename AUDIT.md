# Newskoop v5 — Codebase Audit

**Date:** 2026-03-04
**Last Updated:** 2026-03-05

> Items marked with ~~strikethrough~~ have been fixed.

---

## CRITICAL Security Issues

| # | Issue | File |
|---|-------|------|
| 1 | **Debug endpoint exposed** — `/api/test-auth` has no role check, leaks user counts and JWT data | `src/app/api/test-auth/route.ts` |
| 2 | **Real secrets on disk** — `.env` contains live DB credentials, API keys (Resend, Ably, R2, Sentry) | `.env` |
| 3 | **Broken file uploads** — Logo/picture uploads use `writeFile` to `public/uploads/` (fails on Vercel's read-only FS), no MIME validation | `src/app/api/radio/station/upload-logo/route.ts`, `upload-picture/route.ts` |
| 4 | **Wildcard image remote pattern** — `hostname: '**'` enables SSRF via Next.js image optimization | `next.config.ts:13` |
| 5 | **`Math.random()` for passwords** — Not cryptographically secure | `src/lib/auth.ts:121` |
| 6 | **`'changeme'` fallback** for reset token secret | `src/lib/auth.ts:130` |

---

## HIGH Priority Issues

| # | Issue | File |
|---|-------|------|
| 7 | **Missing auth on `GET /api/stations`** — Any unauthenticated request returns all stations | `src/app/api/stations/route.ts:193` |
| 8 | **Missing role check on `GET /api/users/[id]`** — Any authenticated user can query any user profile | `src/app/api/users/[id]/route.ts` |
| 9 | **Bulletin detail has no role restriction** — Radio users can fetch any bulletin by ID | `src/app/api/newsroom/bulletins/[id]/route.ts:27` |
| 10 | **Create-translations has no role check** — Even INTERNs can create translations | `src/app/api/newsroom/stories/[id]/create-translations/route.ts` |
| 11 | **JWT never re-validates** — Deactivated users retain session for 30 days; role changes require re-login | `src/lib/auth.ts:85-96` |
| 12 | **Cron secret fallback** — `'dev-cron-secret'` fallback + secret accepted via query string | `src/app/api/cron/` routes |
| 13 | **Emails sent inside DB transaction** — Can send email then rollback, or hold transaction open during HTTP call | `src/app/api/stations/route.ts:60` |
| 14 | **No security headers** — Missing X-Frame-Options, CSP, HSTS, etc. | `next.config.ts` / `vercel.json` |
| 15 | **Fabricated analytics data** — User activity endpoint applies `Math.random()` multipliers to real data | `src/app/api/analytics/user-activity/route.ts:76` |
| 16 | **Scheduled publishing not implemented** — `scheduledPublishAt` is stored but nothing actually publishes at that time | `src/app/api/newsroom/stories/[id]/publish/route.ts:202` |
| 17 | **Token collision** — Magic links and password resets share the same `resetToken` field, overwriting each other | `src/lib/magic-link.ts` |

---

## MEDIUM Priority Issues

| # | Issue | File |
|---|-------|------|
| 18 | **Dual legacy/new workflow fields** on Story model — doubles write overhead | `prisma/schema.prisma` |
| 19 | ~~**Orphaned Blob objects** — Audio upload succeeds, then story create fails, blob never cleaned up~~ | `src/app/api/newsroom/stories/route.ts` |
| 20 | **ESLint ignored during builds** — Real problems ship undetected | `next.config.ts:27` |
| 21 | **`@ts-ignore` on jsonwebtoken** — Missing `@types/jsonwebtoken` | `src/lib/auth.ts:7` |
| 22 | **Widespread `as any` casts** in DB operations bypass Prisma type checking | Multiple API routes |
| 23 | **Middleware role ordering fragile** — Depends on object insertion order | `src/middleware.ts:51` |
| 24 | **`callbackUrl` double-encoded** in middleware redirect | `src/middleware.ts:37` |
| 25 | **Missing DB indexes** — `AudioClip.uploadedBy`, `Comment.parentId`, `StoryGroup.publishedAt` | `prisma/schema.prisma` |
| 26 | ~~**Slug TOCTOU race condition** — Concurrent creates can collide on the same slug~~ | `src/lib/slug-utils.ts` |
| 27 | ~~**N+1 queries** in create-translations (separate query per language in loop)~~ | `src/app/api/newsroom/stories/[id]/create-translations/route.ts` |
| 28 | **~41 console.logs** in story creation endpoint, including full story data | `src/app/api/newsroom/stories/route.ts` |
| 29 | **No startup env validation** — Missing vars cause unpredictable runtime failures | Project-wide |
| 30 | **Sentry config nesting** — `treeshake`/`automaticVercelMonitors` incorrectly nested under `webpack` key, may be silently ignored | `next.config.ts:42-47` |
| 31 | **`SENTRY_AUTH_TOKEN` set to DSN URL** — Wrong value, source maps won't upload | `.env:43` |
| 32 | **No session `maxAge`** — JWT tokens live 30 days by default | `src/lib/auth.ts` |
| 33 | **Library clip linking errors silently swallowed** — Story returns 201 but clips not attached | `src/app/api/newsroom/stories/route.ts:584` |
| 34 | ~~**`withAudit` middleware is redundant dead code**~~ (verified: actively used in 25+ routes) | `src/lib/api-handler.ts:78` |
| 35 | **Analytics track endpoint unauthenticated** — No rate limiting, view counts can be inflated | `src/app/api/analytics/track/route.ts` |
| 36 | ~~**Double JWT decode** — `withAuth` + `withAudit` each decode the JWT independently per request~~ | `src/lib/api-handler.ts` |

---

## LOW Priority / Code Quality

| # | Issue | File |
|---|-------|------|
| 37 | **Duplicate debug logging block** — Same log block appears twice in sequence | `src/app/api/newsroom/stories/route.ts:112-122` |
| 38 | **`_audioDescriptions` collected but never used** | `src/app/api/newsroom/stories/route.ts:340` |
| 39 | **`target: "ES2017"`** — Should be `ES2022` for Node 20 runtime | `tsconfig.json` |
| 40 | **Missing `type-check` script** — No standalone `tsc --noEmit` in package.json | `package.json` |
| 41 | **`autoJobCancelation: false`** — Wastes Vercel build minutes | `vercel.json:24` |
| 42 | **`multer` in production deps** — May be unused with App Router's `Request.formData()` | `package.json` |
| 43 | **`@aws-sdk/client-s3` in production deps** — Verify if actually used at runtime | `package.json` |
| 44 | **`seed:production` script escaping** — May break on Windows shells | `package.json:17` |
| 45 | **Legacy `allowedLanguages`/`allowedReligions` String arrays** on Station model alongside new `StationClassification` join table | `prisma/schema.prisma` |
| 46 | **`StoryGroup.name` has no unique constraint** | `prisma/schema.prisma` |
| 47 | **No `prisma.$disconnect()` on graceful shutdown** — Dangling connections during dev restarts | `src/lib/prisma.ts` |
| 48 | **No Prisma logging config** or Neon serverless adapter | `src/lib/prisma.ts` |

---

## UI/UX — Accessibility (High Priority)

| # | Issue | File |
|---|-------|------|
| 49 | ~~**Classifications modal missing ARIA** — Raw `<div>` instead of HeadlessUI Dialog, no `role="dialog"`, focus trap, or `aria-modal`~~ | `src/app/newsroom/classifications/page.tsx:89-175` |
| 50 | ~~**Tab pattern missing ARIA** — User detail tabs lack `role="tab"`, `aria-selected`, `role="tablist"`~~ | `src/app/admin/users/[id]/page.tsx:160-183` |
| 51 | ~~**AnnouncementBell** — No `aria-live` region, dismiss button missing `aria-label`, no focus management on open/close~~ | `src/components/shared/AnnouncementBell.tsx` |
| ~~52~~ | ~~**NewsroomDashboard** — `div` elements with `role="button"` instead of native `<button>`, missing accessible names~~ | ~~`src/components/newsroom/NewsroomDashboard.tsx:238+`~~ |
| 53 | ~~**AudioPlayer** — Seek range input missing `aria-label` or `aria-valuetext`~~ | `src/components/ui/audio-player.tsx` |
| 54 | ~~**Login form** — Errors only shown via toast, no `aria-live` inline error for screen readers~~ | `src/app/login/page.tsx` |

---

## UI/UX — Missing Confirmations (High Priority)

| # | Issue | File |
|---|-------|------|
| 55 | ~~**Bulletin archive** fires immediately with no confirmation dialog~~ | `src/app/newsroom/bulletins/[id]/page.tsx:381-390` |
| 56 | ~~**Bulletin publish** fires immediately — irreversible, distributes to radio stations~~ | `src/app/newsroom/bulletins/[id]/page.tsx:356-367` |
| 57 | ~~**Bulletin "Request Revision"** fires immediately — no reason prompt unlike story revision flow~~ | `src/app/newsroom/bulletins/[id]/page.tsx:344-354` |

---

## UI/UX — Loading & Error States (Medium Priority)

| # | Issue | File |
|---|-------|------|
| 58 | **StoryPipelineView** — 8 parallel queries with no loading indicator, shows `0` counts while loading | `src/components/shared/StoryPipelineView.tsx:34-50` |
| 59 | **StoryDetailPage** — Bare `<p>Loading story...</p>` text | `src/app/newsroom/stories/[id]/page.tsx:652-659` |
| 60 | **StoryEditForm** — Bare `<p>Loading story...</p>` text | `src/components/newsroom/StoryEditForm.tsx:409-417` |
| 61 | **BulletinViewPage** — Bare `<p>Loading bulletin...</p>` text | `src/app/newsroom/bulletins/[id]/page.tsx:231-238` |
| 62 | ~~**RadioDashboard** — Ignores `error` return from all 3 `useQuery` calls, silently shows empty sections~~ | `src/app/radio/page.tsx:52-82` |
| 63 | **StoryPipelineView** — No error state for any of 8 queries | `src/components/shared/StoryPipelineView.tsx` |
| 64 | **StoriesPage Suspense fallback** is bare `<div>Loading...</div>` | `src/app/newsroom/stories/page.tsx:242-248` |
| 65 | **5 places use `alert()` instead of `toast.error()`** | Bulletin schedules, announcements, analytics pages |

---

## UI/UX — Inconsistencies (Medium Priority)

| # | Issue | File |
|---|-------|------|
| ~~66~~ | ~~**3 duplicate RevisionNotes components** — admin, newsroom, and shared versions~~ | ~~`src/components/admin/`, `newsroom/`, `shared/RevisionNotes.tsx`~~ |
| 67 | **`TranslationReviewForm` and `TranslationReviewFormNew` coexist** — incomplete migration | `src/components/newsroom/` |
| ~~68~~ | ~~**3 different loading patterns** across the app — bare text, `DataListLoading`, `animate-pulse` divs~~ | ~~Multiple files~~ |
| 69 | **3 different error feedback patterns** — `alert()`, `toast.error()`, inline `<div>` | Multiple files |
| ~~70~~ | ~~**Filter button pattern inconsistent** — Raw `<button>` vs `<Button>` component for filter tabs~~ | ~~Stories page vs NewsroomDashboard~~ |

---

## UI/UX — Missing Empty States

| # | Issue | File |
|---|-------|------|
| 71 | ~~**BulletinSchedules page** — Shows nothing when no schedules exist~~ (already has empty state) | `src/app/newsroom/bulletins/schedules/page.tsx` |
| 72 | ~~**NewsroomDashboard "My Work" section** — Disappears entirely for new users with no stories~~ (already has empty state) | `src/components/newsroom/NewsroomDashboard.tsx` |

---

## UI/UX — Mobile Responsiveness

| # | Issue | File |
|---|-------|------|
| 73 | ~~**BulletinCreateForm** — 5-step wizard labels overflow on narrow screens (`whitespace-nowrap`)~~ | `src/components/newsroom/bulletins/BulletinCreateForm.tsx:276-340` |
| 74 | ~~**RadioDashboard** — Header rows (heading + count + filters + button) collapse on mobile~~ | `src/app/radio/page.tsx:133-164` |
| 75 | ~~**StoryPipelineView** — Arrow indicators hidden on tablets (`hidden lg:block`), 4-col grid loses visual flow~~ | `src/components/shared/StoryPipelineView.tsx:118-140` |
| 76 | ~~**BulletinViewPage** — Header metadata overflows on mobile, no `flex-wrap`~~ | `src/app/newsroom/bulletins/[id]/page.tsx:258-280` |

---

## UI/UX — Debug Code in Production

| # | Issue | File |
|---|-------|------|
| 77 | **Login page** — 3 `console.log` statements logging auth flow to browser console | `src/app/login/page.tsx:19,44,47` |
| 78 | **Radio story detail** — Dumps full story objects to browser console | `src/app/radio/story/[id]/page.tsx:49-51` |
| 79 | **StoryEditForm** — Debug log for status update | `src/components/newsroom/StoryEditForm.tsx:311` |
| 80 | ~~**StoryEditForm** — Visible buttons show "not yet implemented" toast on click~~ | `src/components/newsroom/StoryEditForm.tsx:265-268` |

---

## UI/UX — Form Validation Gaps

| # | Issue | File |
|---|-------|------|
| 81 | **StoryCreateForm** — No category, language, religion, or locality required on creation (discovered late in review) | `src/components/newsroom/StoryCreateForm.tsx:46-49` |
| 82 | **BulletinCreateForm** — No validation that at least one story is selected before submit | `src/components/newsroom/bulletins/BulletinCreateForm.tsx:39-44` |
| 83 | **UserEditForm** — Mobile number has no format validation | `src/components/admin/UserEditForm.tsx:42-51` |
| 84 | ~~**ClassificationModal** — No minimum length on `name` field, whitespace-only names pass~~ | `src/app/newsroom/classifications/page.tsx:57-84` |
