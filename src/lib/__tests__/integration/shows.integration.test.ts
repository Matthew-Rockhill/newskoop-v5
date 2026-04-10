/**
 * Shows — Integration Tests (Real API)
 *
 * Tests show CRUD, sub-show nesting, episode management, episode publishing,
 * and role-based permissions across the shows API surface.
 */

import { StaffRole, ClassificationType } from '@prisma/client';
import {
  createTestUser,
  createTestClassification,
  createTestShow,
  createTestShowEpisode,
  createTestAudioClip,
  linkAudioToShowEpisode,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'sh';
const TIMEOUT = 30_000;

// Shared references
let journalist: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let subEditor: typeof journalist;
let subEditor2: typeof journalist;
let editor: typeof journalist;

let journalistCookie: string;
let subEditorCookie: string;
let subEditor2Cookie: string;
let editorCookie: string;

let classification: { id: string };

// IDs created via API (for later tests)
let createdShowId: string;
let createdShowSlug: string;
let subShowId: string;
let otherShow: { id: string }; // created by subEditor2 directly in DB

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const journalistUser = await createTestUser(StaffRole.JOURNALIST, SUFFIX, 'journalist');
  const subEditorUser = await createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor');
  const subEditor2User = await createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor2');
  const editorUser = await createTestUser(StaffRole.EDITOR, SUFFIX, 'editor');

  journalist = { ...journalistUser, staffRole: journalistUser.staffRole };
  subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };
  subEditor2 = { ...subEditor2User, staffRole: subEditor2User.staffRole };
  editor = { ...editorUser, staffRole: editorUser.staffRole };

  journalistCookie = await createSessionCookie(journalist);
  subEditorCookie = await createSessionCookie(subEditor);
  subEditor2Cookie = await createSessionCookie(subEditor2);
  editorCookie = await createSessionCookie(editor);

  classification = await createTestClassification('English', ClassificationType.LANGUAGE, SUFFIX);

  // A show owned by subEditor2 (for permission tests)
  otherShow = await createTestShow({
    suffix: SUFFIX,
    label: 'other_show',
    createdById: subEditor2.id,
    isPublished: false,
  });
}, TIMEOUT);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, TIMEOUT);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shows (API Integration)', () => {
  // -----------------------------------------------------------------------
  // 1. Auth guard
  // -----------------------------------------------------------------------

  it('returns 401 without authentication', async () => {
    const res = await fetch('http://localhost:3099/api/newsroom/shows');
    expect(res.status).toBe(401);
  });

  // -----------------------------------------------------------------------
  // 2. JOURNALIST can list but cannot create
  // -----------------------------------------------------------------------

  it('JOURNALIST can list shows', async () => {
    const res = await apiFetch('/api/newsroom/shows', journalistCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shows).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  it('JOURNALIST cannot create a show (403)', async () => {
    const res = await apiFetch('/api/newsroom/shows', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__sh_journalist_show',
        isPublished: false,
      }),
    });
    expect(res.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // 3-4. SUB_EDITOR can create a show with correct fields and slug
  // -----------------------------------------------------------------------

  it('SUB_EDITOR can create a show', async () => {
    const res = await apiFetch('/api/newsroom/shows', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__sh_main_show',
        description: 'Integration test show',
        isPublished: false,
        classificationIds: [classification.id],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.show).toBeDefined();
    expect(body.show.title).toBe('__test__sh_main_show');
    expect(body.show.description).toBe('Integration test show');
    expect(body.show.slug).toBeTruthy();
    expect(body.show.isPublished).toBe(false);
    expect(body.show.createdBy.id).toBe(subEditor.id);
    expect(body.show.classifications.length).toBe(1);

    createdShowId = body.show.id;
    createdShowSlug = body.show.slug;
  });

  it('created show has a valid slug derived from the title', () => {
    // Slug should be lowercase, hyphen-separated, derived from title
    expect(createdShowSlug).toMatch(/test.*sh.*main.*show/i);
  });

  // -----------------------------------------------------------------------
  // 5. Create sub-show with parentId
  // -----------------------------------------------------------------------

  it('creates a sub-show with parentId', async () => {
    const res = await apiFetch('/api/newsroom/shows', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__sh_sub_show',
        isPublished: false,
        parentId: createdShowId,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.show.parentId).toBe(createdShowId);
    subShowId = body.show.id;
  });

  // -----------------------------------------------------------------------
  // 6. List filters: topLevelOnly and parentId
  // -----------------------------------------------------------------------

  it('topLevelOnly=true excludes sub-shows', async () => {
    const res = await apiFetch('/api/newsroom/shows?topLevelOnly=true', subEditorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.shows.map((s: { id: string }) => s.id);
    expect(ids).toContain(createdShowId);
    expect(ids).not.toContain(subShowId);
  });

  it('parentId filter returns only children of that parent', async () => {
    const res = await apiFetch(`/api/newsroom/shows?parentId=${createdShowId}`, subEditorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shows.length).toBeGreaterThanOrEqual(1);
    for (const show of body.shows) {
      expect(show.parentId).toBe(createdShowId);
    }
  });

  // -----------------------------------------------------------------------
  // 7. SUB_EDITOR can update own show
  // -----------------------------------------------------------------------

  it('SUB_EDITOR can update own show', async () => {
    const res = await apiFetch(`/api/newsroom/shows/${createdShowId}`, subEditorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ title: '__test__sh_main_show_updated' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.show.title).toBe('__test__sh_main_show_updated');
  });

  // -----------------------------------------------------------------------
  // 8. SUB_EDITOR cannot update another's show
  // -----------------------------------------------------------------------

  it('SUB_EDITOR cannot update another SUB_EDITOR show (403)', async () => {
    const res = await apiFetch(`/api/newsroom/shows/${otherShow.id}`, subEditorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ title: '__test__sh_hacked' }),
    });

    expect(res.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // 9. EDITOR can update any show
  // -----------------------------------------------------------------------

  it('EDITOR can update any show', async () => {
    const res = await apiFetch(`/api/newsroom/shows/${otherShow.id}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Updated by editor' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.show.description).toBe('Updated by editor');
  });

  // -----------------------------------------------------------------------
  // 10. EDITOR can delete show (soft delete)
  // -----------------------------------------------------------------------

  it('EDITOR can delete a show (soft delete)', async () => {
    // Create a throwaway show to delete
    const createRes = await apiFetch('/api/newsroom/shows', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__sh_to_delete',
        isPublished: false,
      }),
    });
    const { show: throwaway } = await createRes.json();

    const res = await apiFetch(`/api/newsroom/shows/${throwaway.id}`, editorCookie, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('deleted');

    // Verify soft-deleted show no longer appears in list (isActive = false)
    const listRes = await apiFetch('/api/newsroom/shows', editorCookie);
    const listBody = await listRes.json();
    const ids = listBody.shows.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(throwaway.id);
  });

  // -----------------------------------------------------------------------
  // 11. SUB_EDITOR cannot delete
  // -----------------------------------------------------------------------

  it('SUB_EDITOR cannot delete a show (403)', async () => {
    const res = await apiFetch(`/api/newsroom/shows/${createdShowId}`, subEditorCookie, {
      method: 'DELETE',
    });

    expect(res.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // 12. Episode auto-increments episodeNumber
  // -----------------------------------------------------------------------

  describe('Episodes', () => {
    let episodeId1: string;
    let episodeId2: string;

    it('creates first episode with episodeNumber 1', async () => {
      const res = await apiFetch(`/api/newsroom/shows/${createdShowId}/episodes`, subEditorCookie, {
        method: 'POST',
        body: JSON.stringify({
          title: '__test__sh_episode_1',
          description: 'First episode',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.episode.episodeNumber).toBe(1);
      expect(body.episode.showId).toBe(createdShowId);
      expect(body.episode.slug).toBeTruthy();
      episodeId1 = body.episode.id;
    });

    it('creates second episode with auto-incremented episodeNumber', async () => {
      const res = await apiFetch(`/api/newsroom/shows/${createdShowId}/episodes`, subEditorCookie, {
        method: 'POST',
        body: JSON.stringify({
          title: '__test__sh_episode_2',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.episode.episodeNumber).toBe(2);
      episodeId2 = body.episode.id;
    });

    // -----------------------------------------------------------------------
    // 13. Publish requires audio
    // -----------------------------------------------------------------------

    it('publish fails without audio (400)', async () => {
      const res = await apiFetch(
        `/api/newsroom/shows/${createdShowId}/episodes/${episodeId1}/publish`,
        subEditorCookie,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/audio/i);
    });

    // -----------------------------------------------------------------------
    // 14. Publish with audio succeeds
    // -----------------------------------------------------------------------

    it('publish succeeds when episode has audio', async () => {
      // Attach audio to episode via DB helpers
      const audioClip = await createTestAudioClip(SUFFIX, 'ep1_audio', subEditor.id);
      await linkAudioToShowEpisode(episodeId1, audioClip.id, subEditor.id);

      const res = await apiFetch(
        `/api/newsroom/shows/${createdShowId}/episodes/${episodeId1}/publish`,
        subEditorCookie,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.episode.status).toBe('PUBLISHED');
      expect(body.episode.publishedAt).toBeTruthy();
      expect(body.message).toMatch(/published/i);
    });

    // -----------------------------------------------------------------------
    // 15. Unpublish works
    // -----------------------------------------------------------------------

    it('unpublish reverts episode to DRAFT', async () => {
      const res = await apiFetch(
        `/api/newsroom/shows/${createdShowId}/episodes/${episodeId1}/publish`,
        subEditorCookie,
        {
          method: 'DELETE',
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.episode.status).toBe('DRAFT');
      expect(body.episode.publishedAt).toBeNull();
      expect(body.message).toMatch(/unpublish/i);
    });

    // -----------------------------------------------------------------------
    // 16. 404 for non-existent resources
    // -----------------------------------------------------------------------

    it('returns 404 for non-existent show', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await apiFetch(`/api/newsroom/shows/${fakeId}`, subEditorCookie);
      expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent episode', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await apiFetch(
        `/api/newsroom/shows/${createdShowId}/episodes/${fakeId}`,
        subEditorCookie
      );
      expect(res.status).toBe(404);
    });

    it('returns 404 when listing episodes for non-existent show', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await apiFetch(`/api/newsroom/shows/${fakeId}/episodes`, subEditorCookie);
      expect(res.status).toBe(404);
    });

    it('returns 404 when publishing non-existent episode', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await apiFetch(
        `/api/newsroom/shows/${createdShowId}/episodes/${fakeId}/publish`,
        subEditorCookie,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      expect(res.status).toBe(404);
    });
  });
});
