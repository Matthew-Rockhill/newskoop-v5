"use client";

import { useEffect, useState } from "react";
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
import { Select } from "@/components/ui/select";
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useTags, useUpdateTag, useDeleteTag } from "@/hooks/use-tags";
import { useSession } from "next-auth/react";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  category: z.enum(["LOCALITY", "GENERAL"]).default("GENERAL"),
});

type TagFormData = z.infer<typeof tagSchema>;

export default function EditTagPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const tagId = params.id as string;
  const { data, isLoading } = useTags();
  const tags = data?.tags || [];
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const tag = tags.find((t: any) => t.id === tagId);

  // Permission check: only allow edit if user can edit this tag
  const userRole = session?.user?.staffRole;
  const canEdit = userRole === "SUPERADMIN" || (["ADMIN", "EDITOR"].includes(userRole) && tag?.category === "GENERAL");
  const canDelete = canEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
  });

  useEffect(() => {
    if (tag) {
      reset({
        name: tag.name,
        category: tag.category,
      });
    }
  }, [tag, reset]);

  const onSubmit = async (formData: TagFormData) => {
    if (!canEdit) return;
    try {
      await updateTag.mutateAsync({ id: tagId, data: formData });
      toast.success("Tag updated successfully!");
      router.push("/admin/newsroom/tags");
    } catch (error: any) {
      toast.error(error.message || "Failed to update tag");
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setShowDeleteModal(false);
    try {
      await deleteTag.mutateAsync(tagId);
      toast.success("Tag deleted successfully!");
      router.push("/admin/newsroom/tags");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tag");
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <p>Loading tag...</p>
        </div>
      </Container>
    );
  }

  if (!tag) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-red-600">Tag not found</p>
          <Button onClick={() => router.push("/admin/newsroom/tags")} className="mt-4">
            Back to Tags
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Edit Tag"
          action={{
            label: "Back to Tags",
            onClick: () => router.push("/admin/newsroom/tags"),
          }}
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card className="p-6">
            <Heading level={2} className="mb-6">
              Tag Details
            </Heading>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter tag name..."
                    disabled={!canEdit}
                  />
                  {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    {...register("category")}
                    error={errors.category?.message}
                    disabled={!canEdit}
                  >
                    <option value="GENERAL">General</option>
                    <option value="LOCALITY">Locality</option>
                  </Select>
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>
          <Divider />
          <div className="flex justify-between items-center space-x-4">
            <div>
              {canDelete && (
                <Button type="button" color="red" onClick={() => setShowDeleteModal(true)} disabled={deleteTag.isLoading} className="font-bold flex items-center gap-2">
                  <TrashIcon className="h-5 w-5 text-red-600" />
                  {deleteTag.isLoading ? "Deleting..." : "Delete Tag"}
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              <Button
                type="button"
                color="white"
                onClick={() => router.push("/admin/newsroom/tags")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit || updateTag.isLoading}>
                {updateTag.isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <DialogTitle>Delete Tag</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this tag? This action cannot be undone.
          </DialogDescription>
          <DialogActions>
            <Button color="white" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} disabled={deleteTag.isLoading} className="font-bold flex items-center gap-2">
              <TrashIcon className="h-5 w-5 text-red-600" />
              {deleteTag.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Container>
  );
} 