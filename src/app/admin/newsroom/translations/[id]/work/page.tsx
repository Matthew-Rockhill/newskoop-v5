"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Translation, Story, User } from "@prisma/client";

type StoryWithAuthor = Story & {
  author: User;
};
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const translationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Translation is required"),
});

type TranslationFormData = z.infer<typeof translationSchema>;

export default function TranslationWorkPage() {
  const router = useRouter();
  const params = useParams();
  const translationId = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [originalStory, setOriginalStory] = useState<StoryWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchTranslation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/newsroom/translations/${translationId}`);
        if (!res.ok) throw new Error("Failed to fetch translation assignment");
        const data = await res.json();
        setTranslation(data.translation);
        setOriginalStory(data.translation.originalStory);
        // Optionally prefill content if needed
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || "Failed to load translation");
        } else {
          setError("Failed to load translation");
        }
      } finally {
        setLoading(false);
      }
    };
    if (translationId) fetchTranslation();
  }, [translationId]);

  // Sync RTE content with react-hook-form
  useEffect(() => {
    setValue("content", content);
    // Only trigger validation if content changes after mount
    if (content !== "") trigger("content");
  }, [content, setValue, trigger]);

  const onSubmit = async (data: TranslationFormData) => {
    setIsSubmitting(true);
    try {
      // 1. Create the translated story
      const response = await fetch(`/api/newsroom/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: content, // Use RTE content
          priority: originalStory?.priority || "MEDIUM",
          categoryId: originalStory?.categoryId,
          originalStoryId: originalStory?.id,
          isTranslation: true,
          language: translation?.targetLanguage,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create translation");
      }
      const newStory = await response.json();
      // 2. Update the Translation record with translatedStoryId and status
      const updateRes = await fetch(`/api/newsroom/translations/${translationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translatedStoryId: newStory.id,
          status: "IN_PROGRESS",
        }),
      });
      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.error || "Failed to update translation assignment");
      }
      toast.success("Translation submitted!");
      router.push("/admin");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to submit translation");
      } else {
        toast.error("Failed to submit translation");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading translation assignment...</p>
        </div>
      </Container>
    );
  }

  if (error || !translation || !originalStory) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading translation: {error || "Not found"}</p>
          <Button onClick={() => router.push("/admin")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Left: Translation Form */}
        <Card className="p-6">
          <Heading level={2} className="mb-4">Write Translation</Heading>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <Input id="title" {...register("title")}
                placeholder="Enter translation title"
                invalid={!!errors.title}
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">Translation</label>
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
                    className={!!errors.content ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>}
            </div>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Translation"}
            </Button>
          </form>
        </Card>

        {/* Right: Original Story (Read-Only) */}
        <Card className="p-6 bg-gray-50">
          <Heading level={2} className="mb-4">Original Story</Heading>
          <div className="mb-2">
            <Badge color="zinc">{originalStory.status}</Badge>
            <Badge color="blue" className="ml-2">{originalStory.language}</Badge>
          </div>
          <Heading level={3} className="mb-2">{originalStory.title}</Heading>
          <Text className="mb-4 text-gray-700">By {originalStory.author.firstName} {originalStory.author.lastName}</Text>
          <div className="prose max-w-none">
            <div
              className="text-gray-900 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: originalStory.content }}
            />
          </div>
        </Card>
      </div>
    </Container>
  );
} 