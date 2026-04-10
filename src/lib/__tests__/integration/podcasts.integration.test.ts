/**
 * Podcasts — Integration Tests (Real API)
 *
 * Tests podcast CRUD, episode management, publishing workflow,
 * and role-based permissions via real HTTP endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StaffRole, ClassificationType } from '@prisma/client';
import {
  createTestUser,
  createTestClassification,
  createTestPodcast,
  createTestPodcastEpisode,
  createTestAudioClip,
  linkAudioToPodcastEpisode,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'pc';
const TIMEOUT = 30_000;

// Shared references
type TestUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  staffRole: string | null;
};

let journalist: TestUser;
let subEditor: TestUser;
let subEditor2: TestUser;
let editor: TestUser;

let journalistCookie: string;
let subEditorCookie: string;
let subEditor2Cookie: string;
let editorCookie: string;

let langClassification: { id: string };

// IDs populated during tests
let createdPodcastId: string;
let createdPodcastSlug: string;
let createdEpisodeId: string;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

describe('Podcasts (API Integration)', () => {
  beforeAll(async () => {
    await cleanupTestData(SUFFIX);

    const [journalistUser, subEditorUser, subEditor2User, editorUser] = await Promise.all([
      createTestUser(StaffRole.JOURNALIST, SUFFIX, 'journalist'),
      createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor'),
      createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor2'),
      createTestUser(StaffRole.EDITOR, SUFFIX, 'editor'),
    ]);

    journalist = { ...journalistUser, staffRole: journalistUser.staffRole };
    subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };
    subEditor2 = { ...subEditor2User, staffRole: subEditor2User.staffRole };
    editor = { ...editorUser, staffRole: editorUser.staffRole };

    [journalistCookie, subEditorCookie, subEditor2Cookie, editorCookie] = await Promise.all([
      createSessionCookie(journalist),
      createSessionCookie(subEditor),
      createSessionCookie(subEditor2),
      createSessionCookie(editor),
    ]);

    langClassification = await createTestClassification('Podcasts Lang', ClassificationType.LANGUAGE, SUFFIX);
  }, TIMEOUT);

  afterAll(async () => {
    await cleanupTestData(SUFFIX);
  }, TIMEOUT);

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  it('returns 401 without authentication', async () => {
    const res = await apiFetch('/api/newsroom/podcasts', '');
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Podcast CRUD
  // -------------------------------------------------------------------------

  it('JOURNALIST can list podcasts (read permission)', async () => {
    const res = await apiFetch('/api/newsroom/podcasts', journalistCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('podcasts');
    expect(body).toHaveProperty('pagination');
  });

  it('JOURNALIST cannot create a podcast (403)', async () => {
    const res = await apiFetch('/api/newsroom/podcasts', journalistCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_journalist_blocked',
        isPublished: false,
      }),
    });
    expect(res.status).toBe(403);
  });

  it('SUB_EDITOR can create a podcast', async () => {
    const res = await apiFetch('/api/newsroom/podcasts', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_first_podcast',
        description: 'Integration test podcast',
        isPublished: false,
        classificationIds: [langClassification.id],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.podcast).toBeTruthy();
    expect(body.podcast.title).toBe('__test__pc_first_podcast');
    expect(body.podcast.slug).toBeTruthy();
    expect(body.podcast.createdBy.id).toBe(subEditor.id);
    expect(body.podcast.classifications.length).toBe(1);

    createdPodcastId = body.podcast.id;
    createdPodcastSlug = body.podcast.slug;
  });

  it('list returns pagination metadata', async () => {
    const res = await apiFetch('/api/newsroom/podcasts?page=1&perPage=5', subEditorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toHaveProperty('page', 1);
    expect(body.pagination).toHaveProperty('perPage', 5);
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('filter by isPublished works', async () => {
    // Create a published podcast for filtering
    await apiFetch('/api/newsroom/podcasts', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_published_podcast',
        isPublished: true,
      }),
    });

    const unpublishedRes = await apiFetch('/api/newsroom/podcasts?isPublished=false', subEditorCookie);
    expect(unpublishedRes.status).toBe(200);
    const unpublished = await unpublishedRes.json();
    for (const p of unpublished.podcasts) {
      expect(p.isPublished).toBe(false);
    }

    const publishedRes = await apiFetch('/api/newsroom/podcasts?isPublished=true', subEditorCookie);
    expect(publishedRes.status).toBe(200);
    const published = await publishedRes.json();
    for (const p of published.podcasts) {
      expect(p.isPublished).toBe(true);
    }
  });

  it('GET single podcast returns podcast with episodes and creator', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, subEditorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.podcast.id).toBe(createdPodcastId);
    expect(body.podcast.createdBy).toBeTruthy();
    expect(body.podcast.episodes).toBeInstanceOf(Array);
    expect(body.podcast.classifications).toBeInstanceOf(Array);
  });

  it('GET single podcast returns 404 for non-existent ID', async () => {
    const res = await apiFetch('/api/newsroom/podcasts/nonexistent-id-12345', subEditorCookie);
    expect(res.status).toBe(404);
  });

  it('SUB_EDITOR can update own podcast', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, subEditorCookie, {
      method: 'PATCH',
      body: JSON.stringify({
        title: '__test__pc_updated_title',
        description: 'Updated description',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.podcast.title).toBe('__test__pc_updated_title');
    expect(body.podcast.description).toBe('Updated description');
  });

  it('SUB_EDITOR cannot update another user\'s podcast (403)', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, subEditor2Cookie, {
      method: 'PATCH',
      body: JSON.stringify({ title: '__test__pc_hijack_attempt' }),
    });
    expect(res.status).toBe(403);
  });

  it('EDITOR can update any podcast', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Editor override' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.podcast.description).toBe('Editor override');
  });

  it('PATCH returns 400 for duplicate slug', async () => {
    // Create a second podcast to steal its slug
    const createRes = await apiFetch('/api/newsroom/podcasts', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_slug_target',
        isPublished: false,
      }),
    });
    const created = await createRes.json();
    const targetSlug = created.podcast.slug;

    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ slug: targetSlug }),
    });
    expect(res.status).toBe(400);
  });

  it('SUB_EDITOR cannot delete podcast (403)', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}`, subEditorCookie, {
      method: 'DELETE',
    });
    expect(res.status).toBe(403);
  });

  it('EDITOR can delete podcast (soft delete)', async () => {
    // Create a throwaway podcast to delete
    const createRes = await apiFetch('/api/newsroom/podcasts', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_to_delete',
        isPublished: false,
      }),
    });
    const toDelete = await createRes.json();

    const res = await apiFetch(`/api/newsroom/podcasts/${toDelete.podcast.id}`, editorCookie, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('deleted');

    // Soft-deleted podcast should not appear in list (isActive = false)
    const listRes = await apiFetch('/api/newsroom/podcasts', editorCookie);
    const list = await listRes.json();
    const found = list.podcasts.find((p: { id: string }) => p.id === toDelete.podcast.id);
    expect(found).toBeUndefined();
  });

  it('DELETE returns 404 for non-existent podcast', async () => {
    const res = await apiFetch('/api/newsroom/podcasts/nonexistent-id-99999', editorCookie, {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Episodes
  // -------------------------------------------------------------------------

  it('SUB_EDITOR can create an episode', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}/episodes`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_episode_one',
        description: 'First episode',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.episode.title).toBe('__test__pc_episode_one');
    expect(body.episode.episodeNumber).toBe(1);
    expect(body.episode.podcastId).toBe(createdPodcastId);
    expect(body.episode.slug).toBeTruthy();

    createdEpisodeId = body.episode.id;
  });

  it('create episode auto-increments episodeNumber', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}/episodes`, subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        title: '__test__pc_episode_two',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.episode.episodeNumber).toBe(2);
  });

  it('create episode returns 404 for non-existent podcast', async () => {
    const res = await apiFetch('/api/newsroom/podcasts/nonexistent-id-00000/episodes', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({ title: '__test__pc_orphan_episode' }),
    });
    expect(res.status).toBe(404);
  });

  it('list episodes returns episodes for podcast', async () => {
    const res = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}/episodes`, subEditorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episodes).toBeInstanceOf(Array);
    expect(body.episodes.length).toBeGreaterThanOrEqual(2);
  });

  it('list episodes returns 404 for non-existent podcast', async () => {
    const res = await apiFetch('/api/newsroom/podcasts/nonexistent-id-00000/episodes', subEditorCookie);
    expect(res.status).toBe(404);
  });

  it('GET single episode returns episode with podcast', async () => {
    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}`,
      subEditorCookie
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episode.id).toBe(createdEpisodeId);
    expect(body.episode.podcast).toBeTruthy();
    expect(body.episode.audioClips).toBeInstanceOf(Array);
  });

  it('GET episode returns 400 when episode does not belong to podcast', async () => {
    // Create a second podcast and try to access our episode under it
    const createRes = await apiFetch('/api/newsroom/podcasts', editorCookie, {
      method: 'POST',
      body: JSON.stringify({ title: '__test__pc_wrong_parent', isPublished: false }),
    });
    const otherPodcast = await createRes.json();

    const res = await apiFetch(
      `/api/newsroom/podcasts/${otherPodcast.podcast.id}/episodes/${createdEpisodeId}`,
      subEditorCookie
    );
    expect(res.status).toBe(400);
  });

  it('PATCH episode updates fields', async () => {
    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}`,
      subEditorCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: '__test__pc_episode_updated' }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episode.title).toBe('__test__pc_episode_updated');
  });

  // -------------------------------------------------------------------------
  // Publish / Unpublish
  // -------------------------------------------------------------------------

  it('publish episode fails without audio clips (400)', async () => {
    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}/publish`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('audio');
  });

  it('publish episode with audio succeeds', async () => {
    // Create and link an audio clip to the episode
    const audioClip = await createTestAudioClip(SUFFIX, 'ep_audio', subEditor.id);
    await linkAudioToPodcastEpisode(createdEpisodeId, audioClip.id, subEditor.id);

    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}/publish`,
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
    expect(body.message).toContain('published');
  });

  it('unpublish episode works', async () => {
    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}/publish`,
      subEditorCookie,
      {
        method: 'DELETE',
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episode.status).toBe('DRAFT');
    expect(body.episode.publishedAt).toBeNull();
  });

  it('publish with future scheduledPublishAt keeps DRAFT and sets schedule', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days from now

    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}/publish`,
      subEditorCookie,
      {
        method: 'POST',
        body: JSON.stringify({ scheduledPublishAt: futureDate }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episode.status).toBe('DRAFT');
    expect(body.episode.scheduledPublishAt).toBeTruthy();
    expect(body.message).toContain('scheduled');
  });

  // -------------------------------------------------------------------------
  // Episode Delete
  // -------------------------------------------------------------------------

  it('SUB_EDITOR cannot delete episode (403)', async () => {
    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${createdEpisodeId}`,
      subEditorCookie,
      { method: 'DELETE' }
    );
    expect(res.status).toBe(403);
  });

  it('EDITOR can delete episode (hard delete)', async () => {
    // Create a throwaway episode to delete
    const createRes = await apiFetch(`/api/newsroom/podcasts/${createdPodcastId}/episodes`, editorCookie, {
      method: 'POST',
      body: JSON.stringify({ title: '__test__pc_episode_to_delete' }),
    });
    const toDelete = await createRes.json();

    const res = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${toDelete.episode.id}`,
      editorCookie,
      { method: 'DELETE' }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('deleted');

    // Confirm it is gone
    const getRes = await apiFetch(
      `/api/newsroom/podcasts/${createdPodcastId}/episodes/${toDelete.episode.id}`,
      editorCookie
    );
    expect(getRes.status).toBe(404);
  });
});
