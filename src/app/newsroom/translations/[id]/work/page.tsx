"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, DocumentTextIcon, LanguageIcon, CheckCircleIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";

import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PageHeader } from "@/components/ui/page-header";
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from "@/components/ui/fieldset";
import { Avatar } from "@/components/ui/avatar";
import { Divider } from "@/components/ui/divider";
import { Dialog, DialogTitle, DialogDescription, DialogActions } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { CustomAudioPlayer } from "@/components/ui/audio-player";
import { AudioClip as PrismaAudioClip } from '@prisma/client';

const translationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Translation is required"),
});

type TranslationFormData = z.infer<typeof translationSchema>;

interface TranslationWorkPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TranslationWorkPage({ params }: TranslationWorkPageProps) {
  const { id } = use(params);
  return <TranslationWorkForm translationId={id} />;
}

function TranslationWorkForm({ translationId }: { translationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [reviewers, setReviewers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
    control,
  } = useForm<TranslationFormData>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Fetch translation data
  const { data, isLoading, error } = useQuery({
    queryKey: ['translation', translationId],
    queryFn: async () => {
      const res = await fetch(`/api/newsroom/translations/${translationId}`);
      if (!res.ok) throw new Error("Failed to fetch translation");
      return res.json();
    },
  });

  const translation = data?.translation;
  const originalStory = translation?.originalStory;
  const hasExistingTranslation = !!translation?.translatedStoryId;
  const isReadOnly = translation?.status === 'NEEDS_REVIEW' || translation?.status === 'APPROVED';

  // Load existing translation if it exists
  useEffect(() => {
    if (translation?.translatedStory) {
      setValue('title', translation.translatedStory.title);
      setValue('content', translation.translatedStory.content);
      setContent(translation.translatedStory.content);
    }
  }, [translation, setValue]);

  // Fetch reviewers (sub-editors and above)
  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        const response = await fetch('/api/users?staffRole=SUB_EDITOR,EDITOR,ADMIN,SUPERADMIN&isActive=true&perPage=100');
        if (response.ok) {
          const data = await response.json();
          setReviewers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch reviewers:', error);
      }
    };
    fetchReviewers();
  }, []);

  // Sync RTE content with react-hook-form
  useEffect(() => {
    setValue("content", content);
    if (content !== "") trigger("content");
  }, [content, setValue, trigger]);

  // Save translation mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TranslationFormData) => {
      // Create or update the translated story
      const storyResponse = await fetch(
        translation?.translatedStoryId 
          ? `/api/newsroom/stories/${translation.translatedStoryId}`
          : `/api/newsroom/stories`,
        {
          method: translation?.translatedStoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            content: content,
            categoryId: originalStory?.categoryId,
            originalStoryId: originalStory?.id,
            isTranslation: true,
            language: translation?.targetLanguage,
          }),
        }
      );

      if (!storyResponse.ok) {
        const error = await storyResponse.json();
        throw new Error(error.error || "Failed to save translation");
      }

      const story = await storyResponse.json();

      // Update translation record if this is the first save
      if (!translation?.translatedStoryId) {
        const updateRes = await fetch(`/api/newsroom/translations/${translationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            translatedStoryId: story.id,
            status: "IN_PROGRESS",
            startedAt: new Date().toISOString(),
          }),
        });

        if (!updateRes.ok) {
          throw new Error("Failed to update translation record");
        }
      }

      return story;
    },
    onSuccess: () => {
      toast.success("Translation saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['translation', translationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save translation");
    },
  });

  const onSubmit = (data: TranslationFormData) => {
    saveMutation.mutate(data);
  };

  // Submit for review handler
  const handleSubmitForReview = async () => {
    // First validate the form
    const isValid = await trigger();
    if (!isValid) {
      toast.error("Please complete all required fields before submitting for review");
      return;
    }

    // Save the translation first if needed
    if (!hasExistingTranslation || saveMutation.isPending) {
      toast.error("Please save your translation first before submitting for review");
      return;
    }

    setShowSubmitModal(true);
  };

  const confirmSubmitForReview = async () => {
    if (!selectedReviewer) {
      toast.error("Please select a reviewer");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update translation status to NEEDS_REVIEW and assign reviewer
      const response = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "NEEDS_REVIEW",
          reviewerId: selectedReviewer,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit for review");
      }

      toast.success("Translation submitted for review successfully!");
      setShowSubmitModal(false);
      
      // Invalidate queries and redirect
      await queryClient.invalidateQueries({ queryKey: ['translation', translationId] });
      router.push('/newsroom/translations');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit for review";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Audio player handlers
  const handleAudioPlay = (clipId: string) => {
    setPlayingAudioId(clipId);
  };

  const handleAudioStop = () => {
    setPlayingAudioId(null);
  };

  const handleAudioRestart = (clipId: string) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: 0 }));
    setPlayingAudioId(clipId);
  };

  const handleAudioSeek = (clipId: string, time: number) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: time }));
  };

  const handleAudioTimeUpdate = (clipId: string, currentTime: number) => {
    setAudioProgress(prev => ({ ...prev, [clipId]: currentTime }));
  };

  const handleAudioLoadedMetadata = (clipId: string, duration: number) => {
    setAudioDuration(prev => ({ ...prev, [clipId]: duration }));
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text>Loading translation assignment...</Text>
        </div>
      </Container>
    );
  }

  if (error || !translation || !originalStory) {
    return (
      <Container>
        <div className="text-center py-12">
          <Text className="text-red-600">Error loading translation</Text>
          <Button onClick={() => router.push("/newsroom/translations")} className="mt-4">
            Back
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Translate Story"
          description={`Translating "${originalStory.title}" to ${translation.targetLanguage}`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                color="white"
                onClick={() => router.push("/newsroom/translations")}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Translation Form */}
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Heading level={3}>
                  Write Translation
                  <Badge color="green" className="ml-3">
                    <LanguageIcon className="h-3 w-3 mr-1" />
                    {translation.targetLanguage}
                  </Badge>
                </Heading>
                {/* Show translation status */}
                <Badge 
                  color={
                    translation.status === 'PENDING' ? 'amber' :
                    translation.status === 'IN_PROGRESS' ? 'blue' :
                    translation.status === 'NEEDS_REVIEW' ? 'purple' :
                    translation.status === 'APPROVED' ? 'green' :
                    translation.status === 'REJECTED' ? 'red' : 'zinc'
                  }
                >
                  {translation.status.replace('_', ' ')}
                </Badge>
              </div>
              
              {/* Show message if translation is already submitted or approved */}
              {translation.status === 'NEEDS_REVIEW' && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <Text className="text-purple-900">
                    This translation has been submitted for review. You cannot make further edits until the reviewer provides feedback.
                  </Text>
                </div>
              )}
              {translation.status === 'APPROVED' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <Text className="text-green-900">
                    This translation has been approved and cannot be edited.
                  </Text>
                </div>
              )}
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Fieldset>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="title">Translated Title *</Label>
                      <Description>
                        Translate the title appropriately for {translation.targetLanguage} audience
                      </Description>
                      <Input 
                        id="title" 
                        {...register("title")}
                        placeholder={`Enter ${translation.targetLanguage} title...`}
                        invalid={!!errors.title}
                        disabled={isReadOnly}
                      />
                      {errors.title && (
                        <ErrorMessage>{errors.title.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor="content">Translation Content *</Label>
                      <Description>
                        Translate the story content, adapting it culturally as needed
                      </Description>
                      <Controller
                        name="content"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            content={field.value}
                            onChange={(val) => {
                              if (!isReadOnly) {
                                setContent(val);
                                field.onChange(val);
                              }
                            }}
                            placeholder={isReadOnly ? "Translation cannot be edited" : "Write your translation here..."}
                            className="min-h-[400px]"
                          />
                        )}
                      />
                      {errors.content && (
                        <ErrorMessage>{errors.content.message}</ErrorMessage>
                      )}
                    </Field>
                  </FieldGroup>
                </Fieldset>

                <Divider />

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    color="white"
                    onClick={() => router.push(`/newsroom/translations/${translationId}`)}
                  >
                    Cancel
                  </Button>
                  <div className="flex items-center gap-3">
                    {!isReadOnly && (
                      <>
                        <Button 
                          type="submit" 
                          color="primary" 
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? "Saving..." : "Save Translation"}
                        </Button>
                        
                        {/* Show Submit for Review button only when translation is IN_PROGRESS and user is the assigned translator */}
                        {translation?.status === 'IN_PROGRESS' && 
                         translation?.assignedToId === session?.user?.id && 
                         hasExistingTranslation && (
                          <Button
                            type="button"
                            color="secondary"
                            onClick={handleSubmitForReview}
                            disabled={saveMutation.isPending}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Submit for Review
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </form>
            </Card>
          </div>

          {/* Right: Original Story (Read-Only) */}
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Heading level={3}>Original Story</Heading>
                <Badge color="blue">
                  <LanguageIcon className="h-3 w-3 mr-1" />
                  {originalStory.language}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Heading level={4}>{originalStory.title}</Heading>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar
                      className="h-6 w-6"
                      name={`${originalStory.author.firstName} ${originalStory.author.lastName}`}
                    />
                    <Text className="text-sm text-gray-600">
                      By {originalStory.author.firstName} {originalStory.author.lastName}
                    </Text>
                    {originalStory.category && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Badge color="zinc">{originalStory.category.name}</Badge>
                      </>
                    )}
                  </div>
                </div>
                
                <Divider />
                
                <div className="prose max-w-none">
                  <div
                    className="text-gray-700 leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: originalStory.content }}
                  />
                </div>
                
                <Divider />
                
                {/* Audio Clips Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Heading level={4} className="text-sm font-semibold text-gray-900">Audio Clips</Heading>
                    <Badge color="zinc">
                      {originalStory.audioClips?.length || 0} clips
                    </Badge>
                  </div>
                  
                  {!originalStory.audioClips || originalStory.audioClips.length === 0 ? (
                    <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MusicalNoteIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <Text className="text-xs font-medium text-gray-700">No Audio Clips</Text>
                          <Text className="text-xs text-gray-500">This story has no audio content</Text>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {originalStory.audioClips.map((clip: Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration'>) => (
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
                </div>
                
                <Divider />
                
                <Button
                  color="white"
                  onClick={() => router.push(`/newsroom/stories/${originalStory.id}`)}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  View Full Story
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit for Review Modal */}
      <Dialog open={showSubmitModal} onClose={() => setShowSubmitModal(false)}>
        <DialogTitle>Submit Translation for Review</DialogTitle>
        <DialogDescription>
          Select a reviewer for your translation. The reviewer will be notified and can approve or request revisions.
        </DialogDescription>
        
        <div className="mt-4">
          <Label htmlFor="reviewer">Select Reviewer *</Label>
          <Select 
            id="reviewer"
            value={selectedReviewer}
            onChange={(e) => setSelectedReviewer(e.target.value)}
          >
            <option value="">Choose a reviewer...</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.firstName} {reviewer.lastName}
              </option>
            ))}
          </Select>
        </div>

        <DialogActions>
          <Button
            color="white"
            onClick={() => setShowSubmitModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={confirmSubmitForReview}
            disabled={isSubmitting || !selectedReviewer}
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}