"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AudioClip, Translation } from "@prisma/client";

import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Fieldset, FieldGroup, Field, Label, ErrorMessage } from "@/components/ui/fieldset";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Badge } from "@/components/ui/badge";
import { CustomAudioPlayer } from "@/components/ui/audio-player";
import { useStory } from "@/hooks/use-stories";

const publishSchema = z.object({
  followUpDate: z.string().min(1, "Follow-up date is required"),
  followUpNote: z.string().optional(),
  publishImmediately: z.boolean().default(true),
  scheduledPublishAt: z.string().optional(),
  checklistConfirmed: z.boolean().refine(val => val, "You must confirm the checklist before publishing."),
});

type PublishFormData = z.infer<typeof publishSchema>;

export default function PublishStoryPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const storyId = params.id as string;
  const { data: story, isLoading, error } = useStory(storyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if story can be published
  const { data: publishStatus, isLoading: isCheckingStatus } = useQuery({
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
      router.push('/admin');
      return;
    }
  }, [session, status, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PublishFormData>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      checklistConfirmed: false,
      publishImmediately: true,
    },
  });

  const watchPublishImmediately = watch('publishImmediately');
  
  // Stub: translations and their statuses
  const translations = story?.translations || [];
  const canPublish = publishStatus?.canPublish || false;
  const publishIssues = publishStatus?.issues || [];

  const onSubmit = async (formData: PublishFormData) => {
    if (!canPublish) {
      toast.error("Story cannot be published. Please check the requirements.");
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish story');
      }

      await response.json();
      
      if (formData.publishImmediately) {
        toast.success("Story and translations published successfully!");
      } else {
        toast.success("Story scheduled for publishing!");
      }
      
      router.push("/admin/newsroom/stories");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to publish story";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
          <Button onClick={() => router.push('/admin/newsroom/stories')} className="mt-4">
            Back to Stories
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Pre-Publish Checklist"
          action={{
            label: "Back to Story",
            onClick: () => router.push(`/admin/newsroom/stories/${storyId}`),
          }}
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Story Details */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Story Details</Heading>
            <div className="mb-4">
              <div className="font-medium text-lg">{story.title}</div>
              <div className="text-sm text-gray-600">Status: <Badge color="blue">{story.status}</Badge></div>
            </div>
            <div className="prose max-w-none">
              <div className="text-gray-900 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: story.content }} />
            </div>
          </Card>

          {/* Audio Clips */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Audio Clips</Heading>
            {story.audioClips && story.audioClips.length > 0 ? (
              <div className="space-y-4">
                {story.audioClips.map((clip: AudioClip) => (
                  <CustomAudioPlayer key={clip.id} clip={clip} />
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No audio clips attached.</div>
            )}
          </Card>

          {/* Publish Status Checks */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Publication Requirements</Heading>
            {isCheckingStatus ? (
              <div className="text-gray-500">Checking publication requirements...</div>
            ) : (
              <div className="space-y-4">
                {publishIssues.length > 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Issues preventing publication:</h4>
                    <ul className="text-red-700 space-y-1">
                      {publishIssues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">✓ Story is ready for publication</h4>
                    <p className="text-green-700">All requirements have been met.</p>
                  </div>
                )}
                
                {publishStatus?.checks && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className={`flex items-center gap-2 ${publishStatus.checks.hasPermission ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{publishStatus.checks.hasPermission ? '✓' : '✗'}</span>
                      User has publish permission
                    </div>
                    <div className={`flex items-center gap-2 ${publishStatus.checks.correctStatus ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{publishStatus.checks.correctStatus ? '✓' : '✗'}</span>
                      Story status allows publishing
                    </div>
                    <div className={`flex items-center gap-2 ${publishStatus.checks.hasCategory ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{publishStatus.checks.hasCategory ? '✓' : '✗'}</span>
                      Story has category assigned
                    </div>
                    <div className={`flex items-center gap-2 ${publishStatus.checks.translationsApproved ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{publishStatus.checks.translationsApproved ? '✓' : '✗'}</span>
                      All translations approved ({publishStatus.checks.approvedTranslations}/{publishStatus.checks.translationsCount})
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Publishing Options */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Publishing Options</Heading>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label>
                    <input
                      type="radio"
                      {...register("publishImmediately")}
                      value="true"
                      className="mr-2"
                    />
                    Publish immediately
                  </Label>
                </Field>
                <Field>
                  <Label>
                    <input
                      type="radio"
                      {...register("publishImmediately")}
                      value="false"
                      className="mr-2"
                    />
                    Schedule for later
                  </Label>
                  {!watchPublishImmediately && (
                    <div className="mt-2 ml-6">
                      <Label htmlFor="scheduledPublishAt">Scheduled Publish Date & Time</Label>
                      <Input
                        id="scheduledPublishAt"
                        type="datetime-local"
                        {...register("scheduledPublishAt")}
                        className="max-w-sm"
                      />
                    </div>
                  )}
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>

          {/* Associated Translations */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Associated Translations</Heading>
            {translations.length > 0 ? (
              <ul className="space-y-2">
                {translations.map((t: Translation) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="font-medium">{t.targetLanguage}</span>
                    <Badge color={t.status === "APPROVED" ? "green" : "amber"}>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">No translations assigned.</div>
            )}
          </Card>

          {/* Checklist */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Pre-Publish Checklist</Heading>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="followUpDate">Follow-up Date *</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    {...register("followUpDate")}
                  />
                  {errors.followUpDate && <ErrorMessage>{errors.followUpDate.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="followUpNote">Follow-up Note</Label>
                  <Input
                    id="followUpNote"
                    {...register("followUpNote")}
                    placeholder="Add a note for your follow-up (optional)"
                  />
                </Field>
                <Field>
                  <Label htmlFor="checklistConfirmed">Checklist Confirmation *</Label>
                  <input
                    id="checklistConfirmed"
                    type="checkbox"
                    {...register("checklistConfirmed")}
                  />
                  <span className="ml-2">I have reviewed all content, translations, and audio, and confirm this story is ready to publish.</span>
                  {errors.checklistConfirmed && <ErrorMessage>{errors.checklistConfirmed.message}</ErrorMessage>}
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>

          <Divider />
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              color="white"
              onClick={() => router.push(`/admin/newsroom/stories/${storyId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canPublish}>
              {isSubmitting ? (watchPublishImmediately ? "Publishing..." : "Scheduling...") : (watchPublishImmediately ? "Publish Story & Translations" : "Schedule for Publishing")}
            </Button>
          </div>
          {!canPublish && publishIssues.length > 0 && (
            <div className="text-red-600 mt-4">
              Please resolve the issues listed above before publishing.
            </div>
          )}
        </form>
      </div>
    </Container>
  );
} 