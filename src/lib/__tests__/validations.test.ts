import { describe, it, expect } from 'vitest';
import {
  userCreateSchema,
  storyCreateSchema,
  storyUpdateSchema,
  categoryCreateSchema,
  tagCreateSchema,
  stationSchema,
  stationCreateSchema,
  commentCreateSchema,
  classificationCreateSchema,
  classificationUpdateSchema,
} from '../validations';
import { UserType, StaffRole, CommentType } from '@prisma/client';

describe('User Management Validation', () => {
  describe('Staff User Creation', () => {
    it('Valid staff user with all required fields', () => {
      const user = {
        email: 'journalist@newskoop.com',
        firstName: 'Jane',
        lastName: 'Reporter',
        userType: UserType.STAFF,
        staffRole: StaffRole.JOURNALIST,
        isActive: true,
      };
      expect(userCreateSchema.safeParse(user).success).toBe(true);
    });

    it('Staff user requires a role', () => {
      const user = {
        email: 'staff@newskoop.com',
        firstName: 'Staff',
        lastName: 'Member',
        userType: UserType.STAFF,
        isActive: true,
      };
      expect(userCreateSchema.safeParse(user).success).toBe(false);
    });

    it('All staff roles are valid', () => {
      const roles = [StaffRole.INTERN, StaffRole.JOURNALIST, StaffRole.SUB_EDITOR, StaffRole.EDITOR, StaffRole.ADMIN, StaffRole.SUPERADMIN];
      for (const role of roles) {
        const user = {
          email: `${role.toLowerCase()}@newskoop.com`,
          firstName: 'Test',
          lastName: 'User',
          userType: UserType.STAFF,
          staffRole: role,
          isActive: true,
        };
        expect(userCreateSchema.safeParse(user).success).toBe(true);
      }
    });

    it('Invalid email format rejected', () => {
      const user = {
        email: 'not-an-email',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.STAFF,
        staffRole: StaffRole.INTERN,
        isActive: true,
      };
      expect(userCreateSchema.safeParse(user).success).toBe(false);
    });

    it('Empty names rejected', () => {
      const user = {
        email: 'test@newskoop.com',
        firstName: '',
        lastName: 'User',
        userType: UserType.STAFF,
        staffRole: StaffRole.INTERN,
        isActive: true,
      };
      expect(userCreateSchema.safeParse(user).success).toBe(false);
    });
  });

  describe('Radio User Creation', () => {
    it('Valid radio user without staff role', () => {
      const user = {
        email: 'contact@radiostation.co.za',
        firstName: 'Radio',
        lastName: 'Contact',
        userType: UserType.RADIO,
        isActive: true,
      };
      expect(userCreateSchema.safeParse(user).success).toBe(true);
    });
  });
});

describe('Story Content Validation', () => {
  describe('Story Creation', () => {
    it('Valid story with title and content', () => {
      const story = {
        title: 'Breaking: Major Development in Local Politics',
        content: '<p>The city council announced today that...</p>',
      };
      expect(storyCreateSchema.safeParse(story).success).toBe(true);
    });

    it('Story with category, tags, and classifications', () => {
      const story = {
        title: 'Sports Update',
        content: '<p>The match results are in...</p>',
        categoryId: 'cat-sports-123',
        tagIds: ['tag-local', 'tag-breaking'],
        classificationIds: ['class-english', 'class-gauteng'],
      };
      expect(storyCreateSchema.safeParse(story).success).toBe(true);
    });

    it('Empty title rejected', () => {
      const story = { title: '', content: '<p>Content</p>' };
      expect(storyCreateSchema.safeParse(story).success).toBe(false);
    });

    it('Empty content rejected', () => {
      const story = { title: 'Valid Title', content: '' };
      expect(storyCreateSchema.safeParse(story).success).toBe(false);
    });

    it('Title over 255 characters rejected', () => {
      const story = { title: 'A'.repeat(256), content: '<p>Content</p>' };
      expect(storyCreateSchema.safeParse(story).success).toBe(false);
    });
  });

  describe('Story Updates', () => {
    it('Partial update with only title', () => {
      expect(storyUpdateSchema.safeParse({ title: 'Updated Title' }).success).toBe(true);
    });

    it('Update with removed audio IDs', () => {
      const update = {
        title: 'Updated Title',
        removedAudioIds: ['audio-1', 'audio-2'],
      };
      expect(storyUpdateSchema.safeParse(update).success).toBe(true);
    });
  });
});

describe('Classification System Validation', () => {
  describe('Classification Creation', () => {
    it('Valid Language classification', () => {
      const classification = {
        name: 'English',
        type: 'LANGUAGE',
        isActive: true,
      };
      expect(classificationCreateSchema.safeParse(classification).success).toBe(true);
    });

    it('Valid Religion classification', () => {
      const classification = {
        name: 'Christian',
        nameAfrikaans: 'Christen',
        type: 'RELIGION',
        isActive: true,
      };
      expect(classificationCreateSchema.safeParse(classification).success).toBe(true);
    });

    it('Valid Locality classification', () => {
      const classification = {
        name: 'Gauteng',
        type: 'LOCALITY',
        sortOrder: 1,
      };
      expect(classificationCreateSchema.safeParse(classification).success).toBe(true);
    });

    it('Invalid classification type rejected', () => {
      const classification = {
        name: 'Test',
        type: 'INVALID_TYPE',
      };
      expect(classificationCreateSchema.safeParse(classification).success).toBe(false);
    });

    it('All three classification types are valid', () => {
      const types = ['LANGUAGE', 'RELIGION', 'LOCALITY'];
      for (const type of types) {
        const classification = { name: 'Test', type };
        expect(classificationCreateSchema.safeParse(classification).success).toBe(true);
      }
    });
  });

  describe('Classification Updates', () => {
    it('Partial update with name only', () => {
      expect(classificationUpdateSchema.safeParse({ name: 'Updated' }).success).toBe(true);
    });

    it('Update isActive status', () => {
      expect(classificationUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
    });

    it('Update sort order', () => {
      expect(classificationUpdateSchema.safeParse({ sortOrder: 5 }).success).toBe(true);
    });
  });
});

describe('Category and Tag Validation', () => {
  describe('Category Creation', () => {
    it('Valid category with name only', () => {
      expect(categoryCreateSchema.safeParse({ name: 'Politics' }).success).toBe(true);
    });

    it('Category with Afrikaans translation', () => {
      const category = {
        name: 'Sports',
        nameAfrikaans: 'Sport',
        description: 'Sports news',
        descriptionAfrikaans: 'Sport nuus',
      };
      expect(categoryCreateSchema.safeParse(category).success).toBe(true);
    });

    it('Category with valid hex color', () => {
      const category = { name: 'Breaking News', color: '#FF0000' };
      expect(categoryCreateSchema.safeParse(category).success).toBe(true);
    });

    it('Invalid hex color rejected', () => {
      const category = { name: 'Test', color: 'red' };
      expect(categoryCreateSchema.safeParse(category).success).toBe(false);
    });

    it('Subcategory with parent ID', () => {
      const category = { name: 'Local Politics', parentId: 'cat-politics-main' };
      expect(categoryCreateSchema.safeParse(category).success).toBe(true);
    });
  });

  describe('Tag Creation (Topical Tags)', () => {
    it('Valid tag with name', () => {
      expect(tagCreateSchema.safeParse({ name: 'Breaking' }).success).toBe(true);
    });

    it('Tag with Afrikaans name', () => {
      const tag = { name: 'Urgent', nameAfrikaans: 'Dringend' };
      expect(tagCreateSchema.safeParse(tag).success).toBe(true);
    });

    it('Tag name over 50 characters rejected', () => {
      expect(tagCreateSchema.safeParse({ name: 'A'.repeat(51) }).success).toBe(false);
    });
  });
});

describe('Radio Station Validation', () => {
  describe('Station Basic Info', () => {
    it('Valid station with name and province', () => {
      const station = { name: 'Radio Free State', province: 'FREE_STATE' };
      expect(stationSchema.safeParse(station).success).toBe(true);
    });

    it('Station with full contact details', () => {
      const station = {
        name: 'Cape Town Community Radio',
        province: 'WESTERN_CAPE',
        contactEmail: 'info@ctcr.co.za',
        contactNumber: '+27 21 123 4567',
        website: 'https://ctcr.co.za',
      };
      expect(stationSchema.safeParse(station).success).toBe(true);
    });

    it('Invalid email rejected', () => {
      const station = { name: 'Test Radio', province: 'GAUTENG', contactEmail: 'invalid' };
      expect(stationSchema.safeParse(station).success).toBe(false);
    });

    it('Invalid website URL rejected', () => {
      const station = { name: 'Test Radio', province: 'GAUTENG', website: 'not-a-url' };
      expect(stationSchema.safeParse(station).success).toBe(false);
    });
  });

  describe('Station Creation with Users', () => {
    it('Valid station with primary contact', () => {
      const station = {
        name: 'Johannesburg FM',
        province: 'GAUTENG',
        primaryContact: {
          firstName: 'John',
          lastName: 'Manager',
          email: 'john@jhbfm.co.za',
        },
      };
      expect(stationCreateSchema.safeParse(station).success).toBe(true);
    });

    it('Station with additional users', () => {
      const station = {
        name: 'Durban Radio',
        province: 'KWAZULU_NATAL',
        primaryContact: {
          firstName: 'Primary',
          lastName: 'Contact',
          email: 'primary@durban.co.za',
        },
        additionalUsers: [
          { firstName: 'Additional', lastName: 'User', email: 'additional@durban.co.za' },
        ],
      };
      expect(stationCreateSchema.safeParse(station).success).toBe(true);
    });
  });
});

describe('Comment Validation', () => {
  it('Valid general comment', () => {
    const result = commentCreateSchema.safeParse({ content: 'Great work!' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(CommentType.GENERAL);
    }
  });

  it('Revision request comment', () => {
    const comment = {
      content: 'Please fix the spelling in paragraph 3',
      type: CommentType.REVISION_REQUEST,
    };
    expect(commentCreateSchema.safeParse(comment).success).toBe(true);
  });

  it('Approval comment', () => {
    const comment = { content: 'Approved for publication', type: CommentType.APPROVAL };
    expect(commentCreateSchema.safeParse(comment).success).toBe(true);
  });

  it('Empty comment rejected', () => {
    expect(commentCreateSchema.safeParse({ content: '' }).success).toBe(false);
  });
});
