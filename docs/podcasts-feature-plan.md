# Podcasts Feature: Planning Document

**Prepared for:** Newskoop Team Meeting
**Date:** 27 March 2026
**Author:** Development Team

---

## 1. Executive Summary

The team wants to add a **Podcasts** feature that functions identically to the existing Shows system but lives in its own section with its own navigation tab. This document explains how Shows currently work, outlines the approach for Podcasts, and presents options for implementation.

---

## 2. How Shows Work Today

### 2.1 Structure

Shows follow a simple hierarchy:

```
Show (parent)
├── Sub-Show (optional, 1 level deep max)
│   ├── Episode 1
│   └── Episode 2
├── Episode 1
└── Episode 2
```

Each **Show** has:
- Title, description, slug
- Cover image (stored on Vercel Blob)
- Language classifications (for radio station filtering)
- Optional category
- Published/unpublished toggle
- Active/inactive (soft delete)
- Created by (user)

Each **Episode** has:
- Title, description, slug, episode number (auto-incremented per show)
- Rich text show notes
- Up to 5 audio clips (stored on Cloudflare R2)
- Status: DRAFT → PUBLISHED → ARCHIVED
- Optional scheduled publish date
- Duration (auto-calculated from audio clips)

### 2.2 Newsroom Workflow

| Action | Who Can Do It |
|--------|--------------|
| Create show | Sub-Editor, Editor, Admin |
| Edit own show | Sub-Editor (own only), Editor+ (any) |
| Delete show | Editor, Admin |
| Create episode | Sub-Editor, Editor, Admin |
| Upload/manage audio | Sub-Editor, Editor, Admin |
| Publish episode | Sub-Editor, Editor, Admin |
| Unpublish episode | Sub-Editor, Editor, Admin |

**Episode publishing requires at least 1 audio clip.** Episodes can be published immediately or scheduled for a future date.

### 2.3 Radio Station Access

Radio stations see published shows and episodes filtered by:
- Station's allowed languages (via classifications)
- Station's blocked categories
- Only published shows (`isPublished = true`) and active shows (`isActive = true`)
- Only published episodes (`status = PUBLISHED`)

The radio interface provides:
- Show tabs (horizontal, scrollable) with sub-show navigation
- Language filter pills
- Episode grid with inline audio players
- Pagination

### 2.4 Audio System

Audio uses a **direct-to-R2 upload** pattern:
1. Client requests a presigned upload URL from the server
2. Client uploads directly to Cloudflare R2 (bypasses Vercel's body size limit)
3. Client confirms the upload with the API
4. Server creates AudioClip and EpisodeAudioClip records
5. Episode duration is recalculated automatically

Episodes can also link to existing audio clips from the shared library (used across stories and episodes).

When audio is removed from an episode, the system checks if the clip is referenced elsewhere. If not, it's deleted from R2 and the database (orphan prevention).

---

## 3. What Needs to Be Built for Podcasts

### 3.1 The Scope

Podcasts mirrors Shows in every functional way. The differences are purely organisational:

| Aspect | Shows | Podcasts |
|--------|-------|----------|
| Database models | Show, Episode | Podcast, PodcastEpisode |
| Newsroom section | /newsroom/shows | /newsroom/podcasts |
| Radio section | /radio/shows | /radio/podcasts |
| API routes | /api/newsroom/shows/* | /api/newsroom/podcasts/* |
| Radio API | /api/radio/shows/* | /api/radio/podcasts/* |
| Navigation tab | Shows | Podcasts |
| Permissions | canManageShows | canManagePodcasts (or reuse) |
| Content type | Radio shows/programmes | Third-party or in-house podcasts |

### 3.2 Database Changes

New models required (mirroring Show/Episode):

**Podcast model** — same fields as Show:
- id, title, slug, description, coverImage
- parentId (for podcast series/sub-podcasts)
- categoryId, classifications, tags
- createdById, isActive, isPublished
- episodes relationship

**PodcastEpisode model** — same fields as Episode:
- id, podcastId, title, slug, description, episodeNumber
- content (rich text show notes)
- coverImage, audioClips (via PodcastEpisodeAudioClip join table)
- createdById, status, scheduledPublishAt, publishedAt, publishedBy
- duration

**Join tables:**
- PodcastTag (mirrors ShowTag)
- PodcastClassification (mirrors ShowClassification)
- PodcastEpisodeAudioClip (mirrors EpisodeAudioClip)

### 3.3 API Routes

New routes mirroring the shows API:

| Route | Purpose |
|-------|---------|
| GET/POST /api/newsroom/podcasts | List and create podcasts |
| GET/PATCH/DELETE /api/newsroom/podcasts/[id] | Podcast detail, update, delete |
| POST/DELETE /api/newsroom/podcasts/[id]/cover | Cover image upload/delete |
| GET/POST /api/newsroom/podcasts/[id]/episodes | List and create episodes |
| GET/PATCH/DELETE /api/newsroom/podcasts/[id]/episodes/[episodeId] | Episode detail, update, delete |
| POST/DELETE /api/newsroom/podcasts/[id]/episodes/[episodeId]/audio | Audio upload/link/delete |
| POST/DELETE /api/newsroom/podcasts/[id]/episodes/[episodeId]/publish | Publish/unpublish |
| GET /api/radio/podcasts | List published podcasts for radio |
| GET /api/radio/podcasts/episodes | Browse published episodes |
| GET /api/radio/podcasts/[id] | Podcast detail for radio |

### 3.4 UI Pages

**Newsroom pages** (mirroring /newsroom/shows):

| Page | Purpose |
|------|---------|
| /newsroom/podcasts | Podcast list with create/edit/delete |
| /newsroom/podcasts/[id] | Podcast detail with episodes and sub-podcasts |
| /newsroom/podcasts/[id]/episodes/[episodeId] | Episode editor with audio, publishing |

**Radio pages** (mirroring /radio/shows):

| Page | Purpose |
|------|---------|
| /radio/podcasts | Browse published podcasts and episodes |

### 3.5 Components

New components (can largely be copied from shows with renamed props):

| Component | Purpose |
|-----------|---------|
| PodcastForm | Create/edit podcast form |
| PodcastList | Podcast table with actions |

The episode detail page is currently inline (not a separate component), so it would be copied as a page.

### 3.6 Permissions

Two options:

**Option 1: Shared permissions** — reuse `canManageShows` for podcasts. Simpler, anyone who can manage shows can manage podcasts.

**Option 2: Separate permissions** — add `canManagePodcasts`, `canPublishPodcastEpisode`, `canEditPodcast`, `canDeletePodcast`. Allows different access control for shows vs podcasts.

Recommendation: **Option 1** initially. Separate later if needed.

### 3.7 Navigation

**Newsroom sidebar:** Add "Podcasts" tab alongside "Shows"
**Radio navigation:** Add "Podcasts" tab alongside existing tabs (currently shows are under "Speciality")

---

## 4. Implementation Options

### Option A: Full Duplication (Separate Models & Routes)

**Summary:** Create entirely separate Podcast/PodcastEpisode models and duplicate all API routes and UI pages.

**What this means:**
- New database migration with 5 new models (Podcast, PodcastEpisode, PodcastTag, PodcastClassification, PodcastEpisodeAudioClip)
- ~12 new API route files (copied from shows, renamed)
- ~4 new page files (copied from shows, renamed)
- ~2 new component files
- New hooks (use-podcasts.ts, use-podcast-episodes.ts)

**Advantages:**
- Complete independence — podcasts and shows can evolve separately
- No risk of breaking shows when changing podcasts
- Clean separation of concerns
- Simplest to reason about

**Disadvantages:**
- Most code duplication
- Any bug fix or improvement to shows must be manually applied to podcasts
- Larger codebase to maintain
- Longer initial development time

**Estimated effort:** 3-4 days

---

### Option B: Shared Model with Type Field

**Summary:** Add a `type` field to the existing Show model (`SHOW` or `PODCAST`) and filter accordingly. No new models.

**What this means:**
- Add `type: ContentType` enum (SHOW, PODCAST) to Show model
- Add `type: ContentType` to Episode model (inherited from parent)
- All existing routes gain a `type` query parameter
- UI pages filter by type
- Separate navigation tabs point to same pages with different type filter

**Advantages:**
- Minimal code changes
- No duplication — single source of truth
- Bug fixes apply to both automatically
- Fastest to implement

**Disadvantages:**
- Shows and podcasts are tightly coupled — changes to one affect the other
- Database queries always need the type filter (easy to forget)
- If podcasts need different fields in future, the model gets messy
- Harder to reason about — "is this a show or a podcast?" everywhere

**Estimated effort:** 1-2 days

---

### Option C: Shared Components, Separate Models (Recommended)

**Summary:** Create separate database models for Podcasts, but build shared/reusable UI components and hooks that work for both shows and podcasts.

**What this means:**
- New database models (like Option A) — clean separation at the data layer
- Shared form components that accept a `contentType` prop (show vs podcast)
- Shared API handler logic extracted into utility functions
- Separate route files but they call the same underlying logic
- Separate pages but they use the same components with different props

**Advantages:**
- Clean data separation (podcasts and shows can evolve independently)
- Minimal UI code duplication (shared components)
- Bug fixes to shared logic apply to both
- Best of both worlds — independent data, shared presentation

**Disadvantages:**
- More upfront abstraction work
- Shared components need to handle both types gracefully
- Slightly more complex component props

**Estimated effort:** 2-3 days

---

## 5. Comparison Matrix

| Criteria | A: Full Duplication | B: Shared Model | C: Shared Components |
|----------|-------------------|-----------------|---------------------|
| Development time | 3-4 days | 1-2 days | 2-3 days |
| Code duplication | High | None | Low |
| Future flexibility | High | Low | High |
| Maintenance burden | Higher (dual fixes) | Lowest | Moderate |
| Risk to existing shows | None | Medium | None |
| Complexity | Low (just copy) | Low (just filter) | Medium (abstraction) |

---

## 6. Recommendation

**Option C (Shared Components, Separate Models)** provides the best balance:

- Podcasts get their own clean database models, so they can diverge from shows in future without friction
- The UI stays DRY — form components, list components, and audio handling are shared
- No risk of breaking the existing shows feature
- Moderate effort with high long-term payoff

If speed is the priority, **Option B** gets podcasts live fastest but creates technical debt. **Option A** is the safest but creates maintenance debt.

---

## 7. What Stays the Same

Regardless of which option is chosen, the following are shared and don't need duplication:

- **Audio upload system** — R2 presigned URLs, AudioClip model, orphan prevention
- **Cover image system** — Vercel Blob upload/delete
- **Classification system** — Language/Religion/Locality filtering
- **Permission model** — Same role-based access (reuse canManageShows or create parallel)
- **Real-time events** — Ably publishing pattern
- **Rich text editor** — Same TipTap editor for show notes
- **Audio player** — Same CustomAudioPlayer component
- **Radio filtering** — Same station-based language/category filtering

---

## 8. Migration Considerations

If podcasts are created as separate models:

- Existing shows data is untouched
- New migration adds Podcast tables alongside Show tables
- No data migration needed (podcasts start empty)
- AudioClip model is already shared (used by stories and episodes) — podcast episodes would link to the same pool

If using the shared model approach:

- Migration adds `type` field with default `SHOW` to existing records
- All existing shows automatically become type `SHOW`
- No data loss, backward compatible

---

## 9. Questions for the Meeting

1. Should podcasts have the same sub-podcast (hierarchy) feature as shows, or are they flat?
2. Do podcasts need the same publishing workflow (DRAFT → PUBLISHED), or should they publish immediately on upload?
3. Will podcast content come from third parties (external RSS feeds) in future, or is it always manually uploaded?
4. Should podcasts share the same categories as shows, or have their own?
5. Do all staff who can manage shows also manage podcasts, or should there be separate access control?
6. On the radio side, should podcasts appear as a separate tab or be mixed with shows?
7. Is there a need for podcast-specific metadata (e.g., external link, RSS feed URL, host name) that shows don't have?

---

*This document is for internal discussion purposes. No code changes have been made.*
