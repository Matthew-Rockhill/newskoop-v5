"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

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
  checklistConfirmed: z.boolean().refine(val => val, "You must confirm the checklist before publishing."),
});

type PublishFormData = z.infer<typeof publishSchema>;

export default function PublishStoryPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  const { data: story, isLoading, error } = useStory(storyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PublishFormData>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      checklistConfirmed: false,
    },
  });

  // Stub: translations and their statuses
  const translations = story?.translations || [];
  const allTranslationsApproved = translations.length === 0 || translations.every((t: any) => t.status === "APPROVED");

  const onSubmit = async (formData: PublishFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Call API to publish story and translations, and save follow-up date/note
      toast.success("Story and translations published!");
      router.push("/admin/newsroom/stories");
    } catch (error: any) {
      toast.error(error.message || "Failed to publish story");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading story...</p>
        </div>
      </Container>
    );
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
                {story.audioClips.map((clip: any) => (
                  <CustomAudioPlayer key={clip.id} clip={clip} />
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No audio clips attached.</div>
            )}
          </Card>

          {/* Associated Translations */}
          <Card className="p-6">
            <Heading level={2} className="mb-6">Associated Translations</Heading>
            {translations.length > 0 ? (
              <ul className="space-y-2">
                {translations.map((t: any) => (
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
            <Button type="submit" disabled={isSubmitting || !allTranslationsApproved}>
              {isSubmitting ? "Publishing..." : "Publish Story & Translations"}
            </Button>
          </div>
          {!allTranslationsApproved && (
            <div className="text-red-600 mt-4">All translations must be approved before publishing.</div>
          )}
        </form>
      </div>
    </Container>
  );
} 