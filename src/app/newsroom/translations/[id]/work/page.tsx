"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, DocumentTextIcon, LanguageIcon } from "@heroicons/react/24/outline";

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

export default async function TranslationWorkPage({ params }: TranslationWorkPageProps) {
  const { id } = await params;
  return <TranslationWorkForm translationId={id} />;
}

function TranslationWorkForm({ translationId }: { translationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

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

  // Load existing translation if it exists
  useEffect(() => {
    if (translation?.translatedStory) {
      setValue('title', translation.translatedStory.title);
      setValue('content', translation.translatedStory.content);
      setContent(translation.translatedStory.content);
    }
  }, [translation, setValue]);

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
            Back to Translations
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
                Back to Translations
              </Button>
              {hasExistingTranslation && (
                <Button
                  color="secondary"
                  onClick={() => router.push(`/newsroom/translations/${translationId}/review`)}
                >
                  Review & Submit
                </Button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Translation Form */}
          <div>
            <Card className="p-6">
              <Heading level={3} className="mb-6">
                Write Translation
                <Badge color="green" className="ml-3">
                  <LanguageIcon className="h-3 w-3 mr-1" />
                  {translation.targetLanguage}
                </Badge>
              </Heading>
              
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
                              setContent(val);
                              field.onChange(val);
                            }}
                            placeholder="Write your translation here..."
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
                    <Button 
                      type="submit" 
                      color="primary" 
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? "Saving..." : "Save Translation"}
                    </Button>
                    {hasExistingTranslation && (
                      <Button 
                        type="button"
                        color="secondary"
                        onClick={() => router.push(`/newsroom/translations/${translationId}/review`)}
                      >
                        Review & Submit
                      </Button>
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
    </Container>
  );
}