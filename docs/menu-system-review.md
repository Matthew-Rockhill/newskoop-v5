# Menu System Review & Recommendations

**Prepared for:** Newskoop Team Meeting
**Date:** 27 March 2026
**Author:** Development Team

---

## 1. Executive Summary

The menu system currently only understands **categories**. Editors have no way to control what content types (stories, shows, bulletins, podcasts) appear under which menu items. This has led to workarounds — such as creating a "Podcasts" category and trying to file podcast content under it — that don't work because the system treats everything as story categories.

The menu needs to become **content-type aware**, giving editors full control over what shows where.

---

## 2. How the Menu Works Today

### 2.1 The Menu Item Model

Each menu item is one of three types:

| Type | What It Does |
|------|-------------|
| **CATEGORY** | Links to a story category (e.g., "Politics", "Sport"). When a radio user clicks it, they see stories in that category. |
| **CUSTOM_LINK** | An arbitrary URL. Used for external links or manual routing. |
| **DIVIDER** | A visual separator. No link. |

Menu items support:
- Nesting (parent/child hierarchy)
- Sort ordering (drag-and-drop reorder)
- Visibility toggle
- Afrikaans label translation
- Optional icon

### 2.2 Dynamic Content Injection (The Hidden Layer)

Behind the scenes, the radio menu API does something the editor can't see or control: it **auto-injects children** based on URL pattern matching.

When the API builds the menu for a radio station:
- If a menu item's URL contains `/radio/bulletins` → it queries active bulletin schedules and injects them as child items
- If a menu item's URL contains `/radio/shows` → it queries published shows and injects them as child items (with sub-shows as grandchildren)

**The editor has no visibility into or control over this injection.** They can't choose which shows appear, in what order, or under which menu heading.

### 2.3 The Problem

The menu has **no concept of content types**. It only knows:
- Categories → stories
- Custom links → URLs
- Dividers → nothing

This means:
- **Shows** only appear in the menu via the auto-injection hack
- **Bulletins** only appear via the auto-injection hack
- **Podcasts** have no way to appear at all (no model exists yet)
- **Individual stories** can't be pinned to the menu

When an editor creates a category called "Podcasts" and tries to organise content under it, nothing works — because categories only filter stories, and podcasts aren't stories.

### 2.4 The Workaround Being Used

Editors are creating categories to represent content types, then expecting the menu to show the right content. For example:

| What the editor does | What they expect | What actually happens |
|---------------------|-----------------|---------------------|
| Creates "Podcasts" category | Podcast content appears under it | Nothing appears (podcasts aren't stories) |
| Creates "Shows" category | Shows appear under it | Stories tagged with "Shows" category appear (wrong content) |
| Wants a specific show in the menu | No way to do this | Can't — shows are auto-injected, not editor-controlled |

---

## 3. What the Editor Needs

The editor needs to be able to:

1. **Create a menu item that links to any content type** — not just categories
2. **Choose what appears under each menu item** — manually, not auto-injected
3. **Mix content types** — e.g., a "Morning" section with a bulletin, two stories, and a show
4. **Control the order** of items within any section
5. **See what's actually in the menu** — no hidden auto-injection they can't manage

---

## 4. Options for Moving Forward

### Option A: Extend Menu Item Types

**Summary:** Add new menu item types for each content type. The editor explicitly chooses "this menu item links to a show" or "this menu item links to the bulletins list".

**New menu item types:**

| Type | What It Links To | Editor Selects |
|------|-----------------|---------------|
| CATEGORY | Stories in a category | A category from dropdown |
| SHOW | A specific show or the shows list | A show from dropdown (or "All Shows") |
| BULLETIN | The bulletins page or a specific schedule | A schedule from dropdown (or "All Bulletins") |
| PODCAST | A specific podcast or the podcasts list | A podcast from dropdown (or "All Podcasts") |
| STORY | A specific published story | A story from search |
| CUSTOM_LINK | Any URL | Free text URL |
| DIVIDER | Nothing (visual separator) | N/A |

**Database changes:**
- Add SHOW, BULLETIN, PODCAST, STORY to the `MenuItemType` enum
- Add optional foreign keys: `showId`, `bulletinScheduleId`, `storyId` (podcastId when podcasts exist)
- Each type has its own optional reference field

**How it works for the editor:**
1. Editor clicks "Add Menu Item"
2. Selects type: "Show"
3. Searches/selects from published shows
4. Sets label, position, visibility
5. The menu item now links directly to that show

**Auto-population option:** For types like SHOW or BULLETIN, the editor can choose "All Shows" which auto-populates children from published content (replacing the current hidden injection, but now as an explicit editor choice).

**Advantages:**
- Editor has full control over every item
- Clear, explicit — no hidden behaviour
- Each content type has proper routing
- Can mix and match content types freely

**Disadvantages:**
- More complex menu editor UI
- Need to handle cases where linked content is deleted/unpublished
- More fields on the MenuItem model

**Estimated effort:** 3-4 days

---

### Option B: Content-Type Aware Categories

**Summary:** Instead of changing the menu system, make categories content-type aware. A category can be flagged as containing stories, shows, bulletins, or podcasts.

**How it works:**
- Add a `contentTypes` field to the Category model (array of enum values)
- A category marked as `['SHOW']` would display shows, not stories
- A category marked as `['STORY', 'BULLETIN']` would display both
- The radio frontend checks the category's content types and renders accordingly

**Advantages:**
- Minimal changes to the menu system itself
- Categories become more flexible
- Editor's mental model stays the same (organise by category)

**Disadvantages:**
- Categories are doing double duty (organising content AND defining content types)
- Gets confusing fast — "is this a category or a content type?"
- Doesn't solve the "pin a specific show to the menu" use case
- The "Podcasts" category problem still exists conceptually

**Estimated effort:** 2-3 days

---

### Option C: Full Menu Builder with Content Blocks

**Summary:** Replace the current menu system with a drag-and-drop menu builder that supports different block types. Think of it like a page builder but for navigation.

**Block types:**

| Block | Behaviour |
|-------|-----------|
| **Category Block** | Shows stories from a selected category. Optionally auto-populates subcategories as children. |
| **Shows Block** | Shows all published shows (or a selected show). Auto-populates episodes as children. |
| **Bulletins Block** | Shows bulletin schedules. Auto-populates upcoming bulletins. |
| **Podcasts Block** | Shows all published podcasts. Auto-populates episodes. |
| **Story Pin** | Links to a single specific story (for featured/important stories). |
| **Custom Link** | Free URL. |
| **Divider** | Visual separator. |
| **Section Header** | Label-only item (no link) for grouping. |

**Each block has:**
- Auto-populate toggle (on = dynamically fills children, off = editor manually adds children)
- Visibility controls
- Sort order
- Multilingual labels

**How it works for the editor:**
1. Editor opens the menu builder
2. Drags a "Shows Block" into position 3 in the top nav
3. Chooses: auto-populate = yes (all published shows appear as children)
4. Drags a "Story Pin" under the "Breaking News" section
5. Searches for the story and selects it
6. The menu reflects these choices immediately

**Advantages:**
- Most flexible — handles any future content type
- Editor has complete visual control
- Auto-populate is explicit (editor opts in, not hidden)
- Scales well as new content types are added

**Disadvantages:**
- Most complex to build
- Requires a proper drag-and-drop menu builder UI
- Biggest departure from current system

**Estimated effort:** 5-7 days

---

### Option D: Hybrid — Extend Types + Smart Auto-Population (Recommended)

**Summary:** Combine Option A's explicit content types with opt-in auto-population. The editor creates menu items of specific types and can toggle auto-population for section-level items.

**How it works:**

1. Menu items have content types (CATEGORY, SHOW, BULLETIN, PODCAST, STORY, CUSTOM_LINK, DIVIDER)
2. Section-level items (e.g., "Shows", "Bulletins") have an **auto-populate children** toggle:
   - **On:** Children are dynamically generated from published content of that type, filtered by the station's permissions
   - **Off:** Editor manually adds child items
3. The editor can see and override auto-populated items (e.g., hide a specific show, reorder)
4. Individual items (story pins, specific show links) work as direct references

**Example menu the editor could build:**

```
News Stories (CATEGORY, auto-populate subcategories = ON)
├── Politics (auto)
├── Community (auto)
└── Health (auto)

Bulletins (BULLETIN, auto-populate schedules = ON)
├── Morning English 06:00 (auto)
├── Morning Afrikaans 07:00 (auto)
└── Midday English 12:00 (auto)

Shows (SHOW, auto-populate = ON)
├── Agriskoops (auto)
│   └── Latest Episode (auto)
├── Bizskoops (auto)
└── Techskoops (auto)

Podcasts (PODCAST, auto-populate = ON)
├── Podcast A (auto)
└── Podcast B (auto)

Featured (CUSTOM, auto-populate = OFF)
├── Breaking: Election Results (STORY pin)
├── Special Interview Series (SHOW pin)
└── Budget 2026 Coverage (CUSTOM_LINK)
```

**Database changes:**
- Extend `MenuItemType` enum with new types
- Add optional foreign keys for each content type
- Add `autoPopulate` boolean field (default false)
- Add `contentFilter` JSON field (optional — for filtering auto-populated items by language, category, etc.)

**Advantages:**
- Editor has full control but doesn't have to manually manage everything
- Auto-population is opt-in and visible (not hidden)
- Handles mixed content sections ("Featured" with stories + shows)
- Current dynamic injection logic becomes the auto-populate feature (refactored, not thrown away)
- Scales to new content types easily

**Disadvantages:**
- More complex than Option A alone
- Auto-populate + manual override needs careful UI design
- Need to handle conflicts (what if editor hides an auto-populated item, then it changes?)

**Estimated effort:** 4-5 days

---

## 5. Comparison Matrix

| Criteria | A: Extend Types | B: Smart Categories | C: Full Builder | D: Hybrid (Rec.) |
|----------|----------------|-------------------|----------------|-------------------|
| Development effort | 3-4 days | 2-3 days | 5-7 days | 4-5 days |
| Editor control | High | Medium | Highest | High |
| Handles all content types | Yes | Partially | Yes | Yes |
| Auto-population | No | No | Optional | Yes (opt-in) |
| Complexity | Low-Medium | Low | High | Medium |
| Future-proof | Good | Poor | Best | Good |
| Solves the "Podcasts" problem | Yes | Partially | Yes | Yes |

---

## 6. Recommendation

**Option D (Hybrid)** solves the immediate problem while being practical to build:

- The editor can create a "Podcasts" menu item of type PODCAST with auto-populate on — published podcasts appear automatically
- The editor can create a "Featured" section and manually pin specific stories, shows, or bulletins
- The existing dynamic injection logic is refactored into the auto-populate feature (not wasted work)
- When podcasts are built as a new content type, they slot into the menu system immediately

If time is tight, **Option A** (extend types without auto-populate) solves the core problem in less time and auto-populate can be added later.

---

## 7. Impact on Current Menu Items

Regardless of which option is chosen:

- **Existing CATEGORY menu items** continue to work exactly as they do today
- **Existing CUSTOM_LINK items** continue to work
- **The hidden dynamic injection** would be replaced by explicit auto-populate (or removed if Option A)
- **No data migration** needed for existing menu items — new types are additive
- **Editor training** needed to explain the new menu item types

---

## 8. Dependency on Podcasts Feature

The menu changes are **partially dependent** on the Podcasts feature:

- CATEGORY, SHOW, BULLETIN, STORY types can be built immediately
- PODCAST type requires the Podcast model to exist first
- However, the menu system can be built with PODCAST as a type that's "coming soon" — the UI just doesn't show it until the model exists

Recommended approach: build the menu changes first with all types except PODCAST, then add PODCAST when the feature is ready.

---

## 9. Questions for the Meeting

1. Does the editor want to manage every item manually, or is auto-population (with override ability) preferred for sections like "Shows" and "Bulletins"?
2. Should the menu support pinning individual stories (e.g., a breaking news story in the top nav)?
3. Is the current nesting depth (2 levels: parent → child → grandchild) sufficient, or do we need deeper nesting?
4. Should menu changes take effect immediately, or should there be a "draft/publish" workflow for menu edits?
5. Do different radio stations need different menus, or is it one menu for all stations (filtered by permissions)?
6. What happens to a menu item when the linked content is unpublished or deleted? Hide automatically, show as disabled, or remove?

---

*This document is for internal discussion purposes. No code changes have been made.*
