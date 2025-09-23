"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Translation, AudioClip } from "@prisma/client";

import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Fieldset, FieldGroup, Field, Label, Description } from "@/components/ui/fieldset";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomAudioPlayer } from "@/components/ui/audio-player";
import { Checkbox, CheckboxField, CheckboxGroup } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  MusicalNoteIcon
} from "@heroicons/react/24/outline";
import { useStory } from "@/hooks/use-stories";
import { formatLanguage } from "@/lib/language-utils";

// Create schema factory function that can access the current auto-validation state
const createPublishSchema = (allTranslationsApproved: boolean) => z.object({
  followUpDate: z.string().optional(),
  followUpNote: z.string().optional(),
  publishImmediately: z.boolean(),
  
  // Pre-publish checklist items
  contentReviewed: z.boolean().refine(val => val, "Content review must be confirmed"),
  translationsVerified: z.boolean().refine(
    val => val || allTranslationsApproved, 
    "Translation verification must be confirmed"
  ),
  audioQualityChecked: z.boolean().refine(val => val, "Audio quality check must be confirmed"),
  followUpRequired: z.boolean().optional(), // Optional checkbox
  
  scheduledPublishAt: z.string().optional(),
});

type PublishFormData = z.infer<ReturnType<typeof createPublishSchema>>;

export default function PublishStoryPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const storyId = params.id as string;
  const { data: story, isLoading, error } = useStory(storyId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  // Check if story can be published
  const { data: publishStatus } = useQuery({
    queryKey: ['publishStatus', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/newsroom/stories/${storyId}/publish`);
      if (!response.ok) {
        throw new Error('Failed to check publish status');
      }
      return response.json();
    },
    enabled: !!storyId && !!story,
  });

  // Calculate auto-validation state early so we can use it in schema creation
  const translations = story?.translations || [];
  const allTranslationsApproved = translations.length > 0 && translations.every((t: Translation) => t.status === "APPROVED");

  // Create memoized resolver to update when auto-validation state changes
  const publishResolver = useMemo(() => 
    zodResolver(createPublishSchema(allTranslationsApproved)), 
    [allTranslationsApproved]
  );

  // Check permissions
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const userRole = session.user.staffRole;
    // Only SUB_EDITOR and above can publish
    if (!userRole || !['SUB_EDITOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(userRole)) {
      router.push('/newsroom');
      return;
    }
  }, [session, status, router]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PublishFormData>({
    resolver: publishResolver,
    defaultValues: {
      contentReviewed: false,
      translationsVerified: false,
      audioQualityChecked: false,
      followUpRequired: false,
      publishImmediately: true,
      followUpDate: '',
      followUpNote: '',
    },
  });

  const watchPublishImmediately = watch('publishImmediately');
  const watchedValues = watch();
  
  const canPublish = publishStatus?.canPublish || false;
  const publishIssues = publishStatus?.issues || [];
  
  // Automatically update form state when translations are auto-approved
  useEffect(() => {
    if (allTranslationsApproved && !watchedValues.translationsVerified) {
      setValue('translationsVerified', true);
      trigger('translationsVerified');
    }
  }, [allTranslationsApproved, watchedValues.translationsVerified, setValue, trigger]);

  // Custom validation for form completeness - translations are always required
  const isFormValid = watchedValues.contentReviewed && 
    watchedValues.audioQualityChecked && 
    (watchedValues.translationsVerified || allTranslationsApproved);

  const onSubmit: SubmitHandler<PublishFormData> = async (formData: PublishFormData) => {
    if (!canPublish) {
      toast.error("Story cannot be published. Please check the requirements.");
      return;
    }

    // Validate translations - all translations must be verified (either manually or automatically)
    if (!formData.translationsVerified && !allTranslationsApproved) {
      toast.error("Please confirm that all translations have been verified.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/newsroom/stories/${storyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to publish story';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response.json() fails, use the status text as fallback
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await response.json();
      
      if (formData.publishImmediately) {
        toast.success("Story and translations published successfully!");
      } else {
        toast.success("Story scheduled for publishing!");
      }
      
      router.push("/newsroom/stories");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to publish story";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Audio handlers
  const handleAudioPlay = (audioId: string) => {
    setPlayingAudioId(audioId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (audioId: string) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setPlayingAudioId(audioId);
  };

  const handleAudioSeek = (audioId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: time }));
  };

  const handleAudioTimeUpdate = (audioId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [audioId]: currentTime }));
  };

  const handleAudioLoadedMetadata = (audioId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [audioId]: duration }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading...</p>
        </div>
      </Container>
    );
  }

  if (!session?.user) {
    return null; // Will redirect to login
  }

  if (error || !story) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading story: {error?.message || 'Story not found'}</p>
          <Button onClick={() => router.push('/newsroom/stories')} className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <PageHeader
          title={story.title}
          description={
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
                <Badge color="green">{story.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          }
          metadata={{
            sections: [
              {
                title: "Author & Timeline",
                items: [
                  {
                    label: "Author",
                    value: (
                      <>
                        <Avatar
                          className="h-6 w-6"
                          name={`${story.author.firstName} ${story.author.lastName}`}
                        />
                        <span>{story.author.firstName} {story.author.lastName}</span>
                      </>
                    ),
                    type: 'avatar'
                  },
                  {
                    label: "Created",
                    value: formatDate(story.createdAt),
                    type: 'date'
                  },
                  {
                    label: "Last Updated",
                    value: formatDate(story.updatedAt),
                    type: 'date'
                  }
                ]
              },
            ]
          }}
          actions={
            <div className="flex items-center space-x-3">
              <Button
                color="white"
                onClick={() => router.push(`/newsroom/stories/${storyId}`)}
              >
                Back to Story
              </Button>
              <Button
                type="submit"
                form="publish-form"
                disabled={isSubmitting || !canPublish || !isFormValid}
              >
                {isSubmitting 
                  ? (watchPublishImmediately ? "Publishing..." : "Scheduling...") 
                  : (watchPublishImmediately ? "Publish Story" : "Schedule Publishing")}
              </Button>
            </div>
          }
        />


        {/* Warning Callout for Incomplete Requirements */}
        {!canPublish && publishIssues.length > 0 && (
          <Card className="p-4 mt-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <Heading level={5} className="text-red-800 mb-1">
                  Cannot Publish Story
                </Heading>
                <Text className="text-sm text-red-700 mb-2">
                  The following issues must be resolved before publishing:
                </Text>
                <ul className="text-sm text-red-600 space-y-1">
                  {publishIssues.map((issue: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Publication Status Callout */}
        {canPublish && (
          <Card className={`p-4 mt-6 ${isFormValid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-start gap-3">
              {isFormValid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <Heading level={5} className={isFormValid ? "text-green-800 mb-1" : "text-amber-800 mb-1"}>
                  {isFormValid ? "Ready to Publish" : "Ready for Publication"}
                </Heading>
                <Text className={`text-sm ${isFormValid ? 'text-green-700' : 'text-amber-700'}`}>
                  {isFormValid 
                    ? "All requirements and checklist items completed. Ready to publish!"
                    : "All requirements have been met. Complete the checklist below to publish."}
                </Text>
              </div>
            </div>
          </Card>
        )}

        <form id="publish-form" onSubmit={handleSubmit(onSubmit)} className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Story Content */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Story Content</Heading>
                  <Badge color="zinc">
                    {story.content.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: string) => word.length > 0).length} words
                  </Badge>
                </div>
                <div className="prose max-w-none">
                  <div 
                    className="text-gray-900 leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: story.content }}
                  />
                </div>
              </Card>

              {/* Audio Clips Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Audio Clips</Heading>
                  <Badge color="zinc">
                    {story.audioClips?.length || 0} clips
                  </Badge>
                </div>
                
                {!story.audioClips || story.audioClips.length === 0 ? (
                  <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MusicalNoteIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <Text className="text-sm font-medium text-gray-700">No Audio Clips Added</Text>
                        <Text className="text-xs text-gray-500">This story has no audio content attached</Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {story.audioClips.map((clip: AudioClip) => (
                      <CustomAudioPlayer
                        key={clip.id}
                        clip={clip}
                        isPlaying={playingAudioId === clip.id}
                        currentTime={audioProgress[clip.id] || 0}
                        duration={audioDuration[clip.id] || 0}
                        onPlay={handleAudioPlay}
                        onStop={handleAudioStop}
                        onRestart={handleAudioRestart}
                        onSeek={handleAudioSeek}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onLoadedMetadata={handleAudioLoadedMetadata}
                        onEnded={() => setPlayingAudioId(null)}
                        onError={() => {
                          toast.error('Failed to play audio file');
                          setPlayingAudioId(null);
                        }}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {/* Associated Translations */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level={3}>Associated Translations</Heading>
                  <Badge color={translations.length > 0 ? "green" : "zinc"}>
                    {translations.length} translations
                  </Badge>
                </div>
{translations.length > 0 ? (
                  <div className="space-y-3">
                    {translations.map((t: Translation) => (
                      <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatLanguage(t.targetLanguage)}</span>
                          <Badge color={t.status === "APPROVED" ? "green" : "amber"}>{t.status}</Badge>
                        </div>
                        {t.status === "APPROVED" && (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <Text className="font-medium text-red-800 mb-2">No translations found</Text>
                        <Text className="text-sm text-red-700">
                          This story cannot be published without approved translations. Please ensure translations have been assigned and completed.
                        </Text>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publishing Checklist - MOVED TO TOP */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <DocumentTextIcon className="h-6 w-6 text-kelly-green" />
                  <Heading level={4}>Publishing Checklist</Heading>
                </div>
                
                {!isFormValid && (
                  <div className="mb-4 p-3 border-amber-200 bg-amber-50 rounded-lg">
                    <Text className="text-sm text-amber-700">
                      <strong>Required:</strong> Complete all items before publishing.
                    </Text>
                  </div>
                )}
                
                <CheckboxGroup>
                  {/* Content Review */}
                  <CheckboxField>
                    <Checkbox
                      id="contentReviewed"
                      checked={watch('contentReviewed') || false}
                      onChange={(checked) => {
                        setValue('contentReviewed', checked);
                        trigger('contentReviewed');
                      }}
                    />
                    <Label htmlFor="contentReviewed">
                      Content Review Complete
                    </Label>
                    <Description>
                      Final review of story content and editorial quality
                    </Description>
                    {errors.contentReviewed && (
                      <Text className="text-sm text-red-600 mt-1">{errors.contentReviewed.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Translation Verification */}
                  <CheckboxField>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="translationsVerified"
                        checked={watch('translationsVerified') || allTranslationsApproved}
                        onChange={(checked) => {
                          setValue('translationsVerified', checked);
                          trigger('translationsVerified');
                        }}
                        disabled={allTranslationsApproved}
                      />
                      {allTranslationsApproved && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <Label htmlFor="translationsVerified">
                      Translation Verification
                      {allTranslationsApproved && (
                        <span className="ml-2 text-sm text-green-600 font-normal">(Auto-verified)</span>
                      )}
                    </Label>
                    <Description>
                      {allTranslationsApproved 
                        ? "All translations are approved and automatically verified"
                        : "All required translations have been approved and are ready for publishing"}
                    </Description>
                    {errors.translationsVerified && (
                      <Text className="text-sm text-red-600 mt-1">{errors.translationsVerified.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Audio Quality */}
                  <CheckboxField>
                    <Checkbox
                      id="audioQualityChecked"
                      checked={watch('audioQualityChecked') || false}
                      onChange={(checked) => {
                        setValue('audioQualityChecked', checked);
                        trigger('audioQualityChecked');
                      }}
                    />
                    <Label htmlFor="audioQualityChecked">
                      Audio Quality Verification
                    </Label>
                    <Description>
                      Audio clips tested for quality and compatibility
                    </Description>
                    {errors.audioQualityChecked && (
                      <Text className="text-sm text-red-600 mt-1">{errors.audioQualityChecked.message}</Text>
                    )}
                  </CheckboxField>

                  {/* Follow-up Required */}
                  <CheckboxField>
                    <Checkbox
                      id="followUpRequired"
                      checked={watch('followUpRequired') || false}
                      onChange={(checked) => {
                        setValue('followUpRequired', checked);
                        trigger('followUpRequired');
                      }}
                    />
                    <Label htmlFor="followUpRequired">
                      Follow Up Date Set
                    </Label>
                    <Description>
                      Story has a scheduled follow-up date
                    </Description>
                  </CheckboxField>
                </CheckboxGroup>
              </Card>

              {/* Schedule Publishing (Optional) */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarDaysIcon className="h-6 w-6 text-kelly-green" />
                  <Heading level={4}>Schedule Publishing (Optional)</Heading>
                </div>
                
                <CheckboxGroup>
                  <CheckboxField>
                    <Checkbox
                      id="schedulePublish"
                      checked={!watch('publishImmediately')}
                      onChange={(checked) => setValue('publishImmediately', !checked)}
                    />
                    <Label htmlFor="schedulePublish">Schedule for later</Label>
                    <Description>
                      By default, the story will publish immediately. Check this to schedule for a specific date and time.
                    </Description>
                    {!watch('publishImmediately') && (
                      <div className="mt-3 ml-6">
                        <label htmlFor="scheduledPublishAt" className="block text-sm font-medium text-gray-700 mb-1">
                          Publish Date & Time
                        </label>
                        <Input
                          id="scheduledPublishAt"
                          type="datetime-local"
                          {...register("scheduledPublishAt")}
                          required={!watch('publishImmediately')}
                          className="w-full"
                        />
                      </div>
                    )}
                  </CheckboxField>
                </CheckboxGroup>
              </Card>

              {/* Follow-up Planning */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarDaysIcon className="h-6 w-6 text-kelly-green" />
                  <Heading level={4}>Follow-up Planning (Optional)</Heading>
                </div>
                
                <Fieldset>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="followUpDate">Follow-up Date</Label>
                      <Input
                        id="followUpDate"
                        type="date"
                        {...register("followUpDate")}
                      />
                      <Description>
                        Set a date if this story needs to be followed up on
                      </Description>
                    </Field>
                    <Field>
                      <Label htmlFor="followUpNote">Follow-up Note</Label>
                      <textarea
                        id="followUpNote"
                        {...register("followUpNote")}
                        placeholder="Add a note for the follow-up"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-kelly-green focus:border-kelly-green"
                        rows={3}
                      />
                    </Field>
                  </FieldGroup>
                </Fieldset>
              </Card>
            </div>
          </div>
        </form>
      </Container>
    </>
  );
}