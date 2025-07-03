'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TagIcon,
  PencilIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LanguageIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

import { useTags } from '@/hooks/use-tags';
import { useSession } from 'next-auth/react';

// Tag categories for organization
type TagCategory = 'LANGUAGE' | 'LOCALITY' | 'GENERAL';

// Mock function to determine tag category (this will be from the database later)
const getTagCategory = (tagName: string): TagCategory => {
  const languageTags = ['english', 'afrikaans', 'xhosa', 'zulu', 'sotho', 'tswana', 'venda', 'tsonga', 'ndebele', 'swati', 'khoi'];
  const localityTags = ['eastern cape', 'western cape', 'gauteng', 'kwazulu-natal', 'free state', 'limpopo', 'mpumalanga', 'northern cape', 'north west', 'cape town', 'johannesburg', 'durban', 'pretoria', 'port elizabeth', 'bloemfontein'];
  
  const lowerName = tagName.toLowerCase();
  
  if (languageTags.some(lang => lowerName.includes(lang))) {
    return 'LANGUAGE';
  }
  if (localityTags.some(loc => lowerName.includes(loc))) {
    return 'LOCALITY';
  }
  return 'GENERAL';
};

export default function TagsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TagCategory | undefined>(undefined);

  const { data, isLoading, error } = useTags();
  const tags = data?.tags || [];

  // Add category information to tags
  const tagsWithCategories = tags.map(tag => ({
    ...tag,
    category: getTagCategory(tag.name)
  }));

  // Filter tags based on search and category
  const filteredTags = tagsWithCategories.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === undefined || tag.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Check if user can create tags
  const canCreateTag = () => {
    const userRole = session?.user?.staffRole;
    return userRole && ['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(userRole);
  };

  // Check if user can edit a specific tag
  const canEditTag = (tag: any) => {
    const userRole = session?.user?.staffRole;
    if (!userRole) return false;
    
    // SUPERADMIN can edit everything
    if (userRole === 'SUPERADMIN') return true;
    
    // ADMIN and EDITOR can only edit general tags
    if (['ADMIN', 'EDITOR'].includes(userRole)) {
      return tag.category === 'GENERAL';
    }
    
    return false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryIcon = (category: TagCategory) => {
    switch (category) {
      case 'LANGUAGE':
        return LanguageIcon;
      case 'LOCALITY':
        return MapPinIcon;
      case 'GENERAL':
        return TagIcon;
      default:
        return TagIcon;
    }
  };

  const getCategoryColor = (category: TagCategory) => {
    switch (category) {
      case 'LANGUAGE':
        return 'blue';
      case 'LOCALITY':
        return 'purple';
      case 'GENERAL':
        return 'zinc';
      default:
        return 'zinc';
    }
  };

  const getCategoryName = (category: TagCategory) => {
    switch (category) {
      case 'LANGUAGE':
        return 'Language';
      case 'LOCALITY':
        return 'Locality';
      case 'GENERAL':
        return 'General';
      default:
        return 'Unknown';
    }
  };

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading tags: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Tags"
          searchProps={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search tags..."
          }}
          action={
            canCreateTag() ? {
              label: "New Tag",
              onClick: () => router.push('/admin/newsroom/tags/new')
            } : undefined
          }
        />

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setCategoryFilter(undefined)}
            color={categoryFilter === undefined ? 'primary' : 'white'}
            className="text-sm"
          >
            All Tags
          </Button>
          <Button
            onClick={() => setCategoryFilter('LANGUAGE')}
            color={categoryFilter === 'LANGUAGE' ? 'primary' : 'white'}
            className="text-sm"
          >
            <LanguageIcon className="h-4 w-4" />
            Language Tags
          </Button>
          <Button
            onClick={() => setCategoryFilter('LOCALITY')}
            color={categoryFilter === 'LOCALITY' ? 'primary' : 'white'}
            className="text-sm"
          >
            <MapPinIcon className="h-4 w-4" />
            Locality Tags
          </Button>
          <Button
            onClick={() => setCategoryFilter('GENERAL')}
            color={categoryFilter === 'GENERAL' ? 'primary' : 'white'}
            className="text-sm"
          >
            <TagIcon className="h-4 w-4" />
            General Tags
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading tags...</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title="No tags found"
            description="Get started by creating your first tag."
            action={
              canCreateTag() ? {
                label: "New Tag",
                onClick: () => router.push('/admin/newsroom/tags/new')
              } : undefined
            }
          />
        ) : (
          <Table striped>
            <thead>
              <tr>
                <th className="w-2/3">Tag</th>
                <th className="w-1/6">Category</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag) => {
                const CategoryIcon = getCategoryIcon(tag.category);
                
                return (
                  <tr
                    key={tag.id}
                    onClick={() => canEditTag(tag) && router.push(`/admin/newsroom/tags/${tag.id}/edit`)}
                    className={`${canEditTag(tag) ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} focus:outline-none border-b border-gray-100 last:border-b-0`}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <CategoryIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">
                              {tag.name}
                            </div>
                            {!canEditTag(tag) && (
                              <Badge color="red" className="text-xs">
                                Protected
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {getCategoryName(tag.category)} tag
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <DocumentTextIcon className="h-3 w-3" />
                              {tag._count?.stories || 0} stories
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Created {formatDate(tag.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge color={getCategoryColor(tag.category)}>
                        {getCategoryName(tag.category)}
                      </Badge>
                    </td>
                    <td className="py-4">
                      {canEditTag(tag) ? (
                        <Button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/admin/newsroom/tags/${tag.id}/edit`);
                          }}
                          outline
                          className="text-sm"
                        >
                          Edit
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </Container>
  );
} 