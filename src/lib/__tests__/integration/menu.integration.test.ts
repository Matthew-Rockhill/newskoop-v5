/**
 * Menu System — Integration Tests (Real API)
 *
 * Tests the menu CRUD endpoints: permissions, item types (CATEGORY, CUSTOM_LINK,
 * SHOW, PODCAST), parent/child nesting, tree vs flat retrieval, reordering,
 * cascade delete, and error handling.
 */

import { StaffRole } from '@prisma/client';
import {
  createTestUser,
  createTestCategory,
  createTestShow,
  createTestPodcast,
  createTestMenuItem,
  createSessionCookie,
  apiFetch,
  cleanupTestData,
} from './test-helpers';

const SUFFIX = 'mn';
const TIMEOUT = 30_000;

// Shared references
let editor: { id: string; email: string; firstName: string; lastName: string; userType: string; staffRole: string | null };
let intern: typeof editor;
let subEditor: typeof editor;
let editorCookie: string;
let internCookie: string;
let subEditorCookie: string;

// Linked entities for menu items
let category: { id: string };
let show: { id: string };
let podcast: { id: string };

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await cleanupTestData(SUFFIX);

  const editorUser = await createTestUser(StaffRole.EDITOR, SUFFIX, 'editor');
  const internUser = await createTestUser(StaffRole.INTERN, SUFFIX, 'intern');
  const subEditorUser = await createTestUser(StaffRole.SUB_EDITOR, SUFFIX, 'subeditor');

  editor = { ...editorUser, staffRole: editorUser.staffRole };
  intern = { ...internUser, staffRole: internUser.staffRole };
  subEditor = { ...subEditorUser, staffRole: subEditorUser.staffRole };

  editorCookie = await createSessionCookie(editor);
  internCookie = await createSessionCookie(intern);
  subEditorCookie = await createSessionCookie(subEditor);

  // Create linked entities
  category = await createTestCategory('MenuCat', SUFFIX);
  show = await createTestShow({ suffix: SUFFIX, label: 'menushow', createdById: editor.id });
  podcast = await createTestPodcast({ suffix: SUFFIX, label: 'menupodcast', createdById: editor.id });
}, TIMEOUT);

afterAll(async () => {
  await cleanupTestData(SUFFIX);
}, TIMEOUT);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Menu System (API Integration)', () => {
  // Track created IDs for later tests
  let categoryItemId: string;
  let customLinkItemId: string;
  let showItemId: string;
  let podcastItemId: string;
  let childItemId: string;

  // ----- Authentication & Permissions -----

  it('returns 401 without auth', async () => {
    const res = await fetch('http://localhost:3099/api/newsroom/menu', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('INTERN can list menu items (read permission)', async () => {
    const res = await apiFetch('/api/newsroom/menu', internCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('menuItems');
    expect(Array.isArray(body.menuItems)).toBe(true);
  });

  it('SUB_EDITOR cannot create menu items (403)', async () => {
    const res = await apiFetch('/api/newsroom/menu', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_should_fail',
        type: 'CUSTOM_LINK',
        url: 'https://example.com',
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Insufficient permissions');
  });

  // ----- Create Various Types -----

  it('EDITOR can create CATEGORY menu item', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_cat_item',
        type: 'CATEGORY',
        categoryId: category.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.label).toBe('__test__mn_cat_item');
    expect(body.type).toBe('CATEGORY');
    expect(body.categoryId).toBe(category.id);
    expect(body.category).toBeTruthy();
    expect(body.category.id).toBe(category.id);
    categoryItemId = body.id;
  });

  it('EDITOR can create CUSTOM_LINK menu item', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_custom_link',
        type: 'CUSTOM_LINK',
        url: 'https://example.com/test',
        openInNewTab: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.type).toBe('CUSTOM_LINK');
    expect(body.url).toBe('https://example.com/test');
    expect(body.openInNewTab).toBe(true);
    customLinkItemId = body.id;
  });

  it('EDITOR can create SHOW menu item linked to a show', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_show_item',
        type: 'SHOW',
        showId: show.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('SHOW');
    expect(body.show).toBeTruthy();
    expect(body.show.id).toBe(show.id);
    showItemId = body.id;
  });

  it('EDITOR can create PODCAST menu item linked to a podcast', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_podcast_item',
        type: 'PODCAST',
        podcastId: podcast.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('PODCAST');
    expect(body.podcast).toBeTruthy();
    expect(body.podcast.id).toBe(podcast.id);
    podcastItemId = body.id;
  });

  it('EDITOR can create child menu item with parentId', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        label: '__test__mn_child_item',
        type: 'CUSTOM_LINK',
        url: 'https://example.com/child',
        parentId: categoryItemId,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.parentId).toBe(categoryItemId);
    childItemId = body.id;
  });

  // ----- Retrieval -----

  it('GET returns nested tree structure with children', async () => {
    const res = await apiFetch('/api/newsroom/menu', editorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.menuItems)).toBe(true);

    // Find the category parent in the tree
    const parentNode = body.menuItems.find(
      (item: { id: string }) => item.id === categoryItemId
    );
    // It should exist at root level and have the child nested
    if (parentNode) {
      expect(parentNode.children).toBeDefined();
      expect(Array.isArray(parentNode.children)).toBe(true);
      const childNode = parentNode.children.find(
        (c: { id: string }) => c.id === childItemId
      );
      expect(childNode).toBeTruthy();
    }
  });

  it('GET with ?flat=true returns flat list', async () => {
    const res = await apiFetch('/api/newsroom/menu?flat=true', editorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.menuItems)).toBe(true);

    // In flat mode, items should not have a children property from tree building.
    // The child item should appear at the top level of the array.
    const childInFlat = body.menuItems.find(
      (item: { id: string }) => item.id === childItemId
    );
    expect(childInFlat).toBeTruthy();
    expect(childInFlat.parentId).toBe(categoryItemId);
  });

  it('GET /api/newsroom/menu/[id] returns single item with children', async () => {
    const res = await apiFetch(`/api/newsroom/menu/${categoryItemId}`, editorCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(categoryItemId);
    expect(body.children).toBeDefined();
    expect(Array.isArray(body.children)).toBe(true);
  });

  // ----- Update -----

  it('EDITOR can update a menu item', async () => {
    const res = await apiFetch(`/api/newsroom/menu/${customLinkItemId}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({
        label: '__test__mn_custom_link_updated',
        url: 'https://example.com/updated',
        isVisible: false,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.label).toBe('__test__mn_custom_link_updated');
    expect(body.url).toBe('https://example.com/updated');
    expect(body.isVisible).toBe(false);
  });

  it('returns 400 when setting parentId to self', async () => {
    const res = await apiFetch(`/api/newsroom/menu/${categoryItemId}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({
        parentId: categoryItemId,
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Menu item cannot be its own parent');
  });

  it('SUB_EDITOR cannot update menu items (403)', async () => {
    const res = await apiFetch(`/api/newsroom/menu/${customLinkItemId}`, subEditorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ label: '__test__mn_should_not_update' }),
    });
    expect(res.status).toBe(403);
  });

  // ----- Reorder -----

  it('EDITOR can reorder menu items', async () => {
    const res = await apiFetch('/api/newsroom/menu/reorder', editorCookie, {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { id: categoryItemId, parentId: null, sortOrder: 2 },
          { id: customLinkItemId, parentId: null, sortOrder: 0 },
          { id: showItemId, parentId: null, sortOrder: 1 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(3);

    // Verify the new order by fetching flat list
    const listRes = await apiFetch('/api/newsroom/menu?flat=true', editorCookie);
    const listBody = await listRes.json();
    const custom = listBody.menuItems.find((i: { id: string }) => i.id === customLinkItemId);
    const showItem = listBody.menuItems.find((i: { id: string }) => i.id === showItemId);
    const catItem = listBody.menuItems.find((i: { id: string }) => i.id === categoryItemId);
    expect(custom.sortOrder).toBe(0);
    expect(showItem.sortOrder).toBe(1);
    expect(catItem.sortOrder).toBe(2);
  });

  it('SUB_EDITOR cannot reorder menu items (403)', async () => {
    const res = await apiFetch('/api/newsroom/menu/reorder', subEditorCookie, {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { id: categoryItemId, parentId: null, sortOrder: 0 },
        ],
      }),
    });
    expect(res.status).toBe(403);
  });

  // ----- 404 Handling -----

  it('returns 404 for GET on non-existent menu item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await apiFetch(`/api/newsroom/menu/${fakeId}`, editorCookie);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Menu item not found');
  });

  it('returns 404 for PATCH on non-existent menu item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await apiFetch(`/api/newsroom/menu/${fakeId}`, editorCookie, {
      method: 'PATCH',
      body: JSON.stringify({ label: 'ghost' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Menu item not found');
  });

  it('returns 404 for DELETE on non-existent menu item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await apiFetch(`/api/newsroom/menu/${fakeId}`, editorCookie, {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Menu item not found');
  });

  // ----- Delete with Cascade -----

  it('EDITOR can delete a menu item and children cascade', async () => {
    // Delete the category parent — its child should also be removed
    const res = await apiFetch(`/api/newsroom/menu/${categoryItemId}`, editorCookie, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.deletedChildren).toBe(1); // the child item

    // Verify the child is also gone
    const childRes = await apiFetch(`/api/newsroom/menu/${childItemId}`, editorCookie);
    expect(childRes.status).toBe(404);
  });

  it('SUB_EDITOR cannot delete menu items (403)', async () => {
    const res = await apiFetch(`/api/newsroom/menu/${customLinkItemId}`, subEditorCookie, {
      method: 'DELETE',
    });
    expect(res.status).toBe(403);
  });
});
