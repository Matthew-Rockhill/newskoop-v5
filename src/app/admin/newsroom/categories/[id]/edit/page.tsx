"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Select } from "@/components/ui/select";
import { useCategories, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { useSession } from "next-auth/react";
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';
import { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const categoryId = params.id as string;
  const { data, isLoading } = useCategories(true);
  const categories = data?.categories || [];
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const category = categories.find((cat: Category) => cat.id === categoryId);

  // Permission check: only allow edit if user can edit this category
  const userRole = session?.user?.staffRole;
  const canEdit = userRole === "SUPERADMIN" || (userRole && ["ADMIN", "EDITOR"].includes(userRole) && category?.level && category.level > 1);
  const canDelete = userRole === "SUPERADMIN" || (userRole && ["ADMIN", "EDITOR"].includes(userRole) && category?.level && category.level > 1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || "",
        parentId: category.parent?.id || "",
      });
    }
  }, [category, reset]);

  const onSubmit = async (formData: CategoryFormData) => {
    if (!canEdit) return;
    try {
      await updateCategory.mutateAsync({ id: categoryId, data: formData });
      toast.success("Category updated successfully!");
      router.push("/admin/newsroom/categories");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update category");
      } else {
        toast.error("Failed to update category");
      }
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setShowDeleteModal(false);
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast.success("Category deleted successfully!");
      router.push("/admin/newsroom/categories");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to delete category");
      } else {
        toast.error("Failed to delete category");
      }
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading category...</p>
        </div>
      </Container>
    );
  }

  if (!category) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Category not found</p>
          <Button onClick={() => router.push("/admin/newsroom/categories")} className="mt-4">
            Back to Categories
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Edit Category"
          action={{
            label: "Back to Categories",
            onClick: () => router.push("/admin/newsroom/categories"),
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
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter category name..."
                    disabled={!canEdit}
                  />
                  {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    {...register("description")}
                    placeholder="Enter description (optional)"
                    disabled={!canEdit}
                  />
                  {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="parentId">Parent Category</Label>
                  <Select
                    id="parentId"
                    {...register("parentId")}
                    error={errors.parentId?.message}
                    helpText="Select a parent to create a Level 2 or Level 3 category. Only 3 levels are supported."
                    disabled={!canEdit}
                  >
                    <option value="">No parent (Level 1)</option>
                    {categories
                      .filter((cat: Category) => (cat.level === 1 || cat.level === 2) && cat.id !== categoryId)
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
          <div className="flex justify-between items-center space-x-4">
            <div>
              {canDelete && (
                <Button type="button" color="red" onClick={() => setShowDeleteModal(true)} disabled={deleteCategory.isLoading}>
                  {deleteCategory.isLoading ? "Deleting..." : "Delete Category"}
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              <Button
                type="button"
                color="white"
                onClick={() => router.push("/admin/newsroom/categories")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit || updateCategory.isLoading}>
                {updateCategory.isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this category? This action cannot be undone.
          </DialogDescription>
          <DialogActions>
            <Button color="white" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} disabled={deleteCategory.isLoading} className="font-bold flex items-center gap-2">
              <TrashIcon className="h-5 w-5 text-red-600" />
              {deleteCategory.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Container>
  );
} 