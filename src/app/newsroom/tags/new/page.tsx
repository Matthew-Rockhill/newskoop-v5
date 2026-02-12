"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
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
import { useCreateTag } from "@/hooks/use-tags";
import { useSession } from "next-auth/react";
import { hasTagPermission } from "@/lib/permissions";
import { StaffRole } from "@prisma/client";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  nameAfrikaans: z.string().max(50).optional(),
});

type TagFormData = z.infer<typeof tagSchema>;

export default function NewTagPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTag = useCreateTag();

  // Permission check
  const userRole = session?.user?.staffRole as StaffRole | null;
  const canCreate = hasTagPermission(userRole, 'create');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tagSchema),
  });

  const onSubmit: SubmitHandler<TagFormData> = async (formData) => {
    setIsSubmitting(true);
    try {
      await createTag.mutateAsync({
        name: formData.name,
        nameAfrikaans: formData.nameAfrikaans || undefined,
      });
      toast.success("Tag created successfully!");
      router.push("/newsroom/tags");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to create tag");
      } else {
        toast.error("Failed to create tag");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">You do not have permission to create tags.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Create Tag"
          action={{
            label: "Back to Tags",
            onClick: () => router.push("/newsroom/tags"),
          }}
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card className="p-6">
            <Heading level={2} className="mb-6">
              Tag Details
            </Heading>
            <p className="text-sm text-zinc-500 mb-4">
              Tags are topical labels for organizing stories. For language, religion, and locality, use Classifications.
            </p>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter tag name..."
                  />
                  {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="nameAfrikaans">Name (Afrikaans)</Label>
                  <Input
                    id="nameAfrikaans"
                    {...register("nameAfrikaans")}
                    placeholder="Enter Afrikaans tag name..."
                  />
                  {errors.nameAfrikaans && <ErrorMessage>{errors.nameAfrikaans.message}</ErrorMessage>}
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>
          <Divider />
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              color="white"
              onClick={() => router.push("/newsroom/tags")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Tag"}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
}
