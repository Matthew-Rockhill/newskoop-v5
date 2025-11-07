"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import { Container } from '@/components/ui/container';
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Fieldset, FieldGroup, Field, Label, ErrorMessage } from "@/components/ui/fieldset";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Textarea } from "@/components/ui/textarea";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { Select } from "@/components/ui/select";
import { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  nameAfrikaans: z.string().max(100).optional(),
  description: z.string().optional(),
  descriptionAfrikaans: z.string().optional(),
  parentId: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function NewCategoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, isLoading } = useCategories(true);
  const categories = data?.categories || [];
  const createCategory = useCreateCategory();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      color: "#76BD43",
    },
  });

  const onSubmit = async (formData: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      await createCategory.mutateAsync(formData);
      toast.success("Category created successfully!");
      router.push("/newsroom/categories");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to create category");
      } else {
        toast.error("Failed to create category");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Create Category"
          action={{
            label: "Back to Categories",
            onClick: () => router.push("/newsroom/categories"),
          }}
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card className="p-6">
            <Heading level={2} className="mb-6">
              Category Details
            </Heading>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter category name..."
                  />
                  {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="nameAfrikaans">Name (Afrikaans)</Label>
                  <Input
                    id="nameAfrikaans"
                    {...register("nameAfrikaans")}
                    placeholder="Enter Afrikaans category name..."
                  />
                  {errors.nameAfrikaans && <ErrorMessage>{errors.nameAfrikaans.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="description">Description (English)</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter description (optional)"
                    rows={2}
                  />
                  {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="descriptionAfrikaans">Description (Afrikaans)</Label>
                  <Textarea
                    id="descriptionAfrikaans"
                    {...register("descriptionAfrikaans")}
                    placeholder="Enter Afrikaans description (optional)"
                    rows={2}
                  />
                  {errors.descriptionAfrikaans && <ErrorMessage>{errors.descriptionAfrikaans.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="parentId">Parent Category</Label>
                  <Select
                    id="parentId"
                    {...register("parentId")}
                    error={errors.parentId?.message}
                    helpText="Select a parent to create a Level 2 or Level 3 category. Only 3 levels are supported."
                  >
                    <option value="">No parent (Level 1)</option>
                    {categories
                      .filter((cat: Category) => cat.level === 1 || cat.level === 2)
                      .map((cat: Category) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.level === 1 ? `Level 1: ${cat.name}` : `Level 2: ${cat.name}`}
                        </option>
                      ))}
                  </Select>
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>
          <Divider />
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              color="white"
              onClick={() => router.push("/newsroom/categories")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </Container>
  );
} 