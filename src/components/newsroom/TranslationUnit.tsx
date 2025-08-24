import { useRouter } from 'next/navigation';
import { 
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';

interface Translation {
  id: string;
  targetLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  translatedStory?: {
    id: string;
    title: string;
    slug: string;
  };
}

interface TranslationUnitProps {
  storyStatus: string;
  translations: Translation[];
  className?: string;
}

const translationStatusColors = {
  PENDING: 'amber',
  IN_PROGRESS: 'blue',
  NEEDS_REVIEW: 'purple',
  APPROVED: 'emerald',
  REJECTED: 'red',
  PUBLISHED: 'green',
} as const;

const translationStatusIcons = {
  PENDING: ClockIcon,
  IN_PROGRESS: ClockIcon,
  NEEDS_REVIEW: EyeIcon,
  APPROVED: CheckCircleIcon,
  REJECTED: XMarkIcon,
  PUBLISHED: CheckCircleIcon,
};

export function TranslationUnit({
  storyStatus,
  translations,
  className = "",
}: TranslationUnitProps) {
  const router = useRouter();

  // Calculate unit completion status
  const totalTranslations = translations.length;
  const approvedTranslations = translations.filter(t => t.status === 'APPROVED').length;
  const publishedTranslations = translations.filter(t => t.status === 'PUBLISHED').length;
  const pendingTranslations = translations.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;
  const reviewingTranslations = translations.filter(t => t.status === 'NEEDS_REVIEW').length;
  const rejectedTranslations = translations.filter(t => t.status === 'REJECTED').length;

  const isUnitComplete = totalTranslations > 0 && approvedTranslations === totalTranslations;
  const isUnitPublished = totalTranslations > 0 && publishedTranslations === totalTranslations;

  // Don't show if no translations exist and story isn't in translation workflow
  if (totalTranslations === 0 && !['PENDING_TRANSLATION', 'READY_TO_PUBLISH'].includes(storyStatus)) {
    return null;
  }

  const getUnitStatusBadge = () => {
    if (isUnitPublished) {
      return <Badge color="green">All Translations Published</Badge>;
    }
    if (isUnitComplete) {
      return <Badge color="emerald">Ready to Publish</Badge>;
    }
    if (totalTranslations === 0) {
      return <Badge color="amber">No Translations Created</Badge>;
    }
    if (reviewingTranslations > 0) {
      return <Badge color="purple">{reviewingTranslations} Awaiting Review</Badge>;
    }
    if (rejectedTranslations > 0) {
      return <Badge color="red">{rejectedTranslations} Need Revision</Badge>;
    }
    if (pendingTranslations > 0) {
      return <Badge color="blue">{pendingTranslations} In Progress</Badge>;
    }
    return <Badge color="zinc">Mixed Status</Badge>;
  };

  const handleViewTranslation = (translationId: string) => {
    router.push(`/newsroom/translations/${translationId}/work`);
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={3}>Translation Unit</Heading>
          {getUnitStatusBadge()}
        </div>

        {totalTranslations === 0 ? (
          <div className="text-center py-4">
            <Text className="text-gray-500 text-sm">
              No translations have been created for this story.
            </Text>
          </div>
        ) : (
          <>
            {/* Progress Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {approvedTranslations}/{totalTranslations}
                </div>
                <div className="text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {totalTranslations}
                </div>
                <div className="text-gray-500">Languages</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalTranslations > 0 ? (approvedTranslations / totalTranslations) * 100 : 0}%` }}
              />
            </div>

            {/* Translation List */}
            <div className="space-y-2">
              {translations.map((translation) => {
                const StatusIcon = translationStatusIcons[translation.status as keyof typeof translationStatusIcons] || ClockIcon;
                
                return (
                  <div key={translation.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{translation.targetLanguage}</span>
                            <Badge 
                              color={translationStatusColors[translation.status as keyof typeof translationStatusColors] || 'zinc'}
                              size="sm"
                            >
                              {translation.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {translation.assignedTo && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Avatar
                                className="h-3 w-3"
                                name={`${translation.assignedTo.firstName} ${translation.assignedTo.lastName}`}
                              />
                              <span>{translation.assignedTo.firstName} {translation.assignedTo.lastName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          color="white"
                          onClick={() => handleViewTranslation(translation.id)}
                        >
                          <EyeIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unit Status Message */}
            {totalTranslations > 0 && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                {isUnitComplete ? (
                  <div className="flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3 text-emerald-600" />
                    <span>All translations approved. Story is ready to publish.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3 text-amber-600" />
                    <span>
                      {approvedTranslations > 0 
                        ? `${totalTranslations - approvedTranslations} more translations needed before publishing.`
                        : 'All translations must be approved before story can be published.'
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}