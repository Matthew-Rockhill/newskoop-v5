"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStory } from "@/hooks/use-stories";

const translationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Translation is required"),
});

type TranslationFormData = z.infer<typeof translationSchema>;

export default function TranslationWorkPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  const { data: storyData, isLoading, error } = useStory(storyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TranslationFormData>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const onSubmit = async (data: TranslationFormData) => {
    setIsSubmitting(true);
    try {
      // Call API to create translation story and update translation assignment
      const response = await fetch(`/api/newsroom/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          priority: storyData?.priority || "MEDIUM",
          categoryId: storyData?.category?.id,
          originalStoryId: storyId,
          isTranslation: true,
          language: storyData?.language === "AFRIKAANS" ? "XHOSA" : "AFRIKAANS", // Example: flip language
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create translation");
      }
      toast.success("Translation submitted!");
      router.push("/admin");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit translation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading original story...</p>
        </div>
      </Container>
    );
  }

  if (error || !storyData) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading story: {error?.message || "Story not found"}</p>
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
              <Textarea id="content" {...register("content")}
                rows={12}
                placeholder="Write your translation here..."
                invalid={!!errors.content}
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
            <Badge color="zinc">{storyData.status}</Badge>
            <Badge color="blue" className="ml-2">{storyData.language}</Badge>
          </div>
          <Heading level={3} className="mb-2">{storyData.title}</Heading>
          <Text className="mb-4 text-gray-700">By {storyData.author.firstName} {storyData.author.lastName}</Text>
          <div className="prose max-w-none">
            <div
              className="text-gray-900 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: storyData.content }}
            />
          </div>
        </Card>
      </div>
    </Container>
  );
} 