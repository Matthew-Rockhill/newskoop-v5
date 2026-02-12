"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Dialog, DialogTitle, DialogDescription, DialogActions } from '@/components/ui/dialog';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useTags, useUpdateTag, useDeleteTag, type Tag } from "@/hooks/use-tags";
import { useSession } from "next-auth/react";
import { hasTagPermission } from "@/lib/permissions";
import { StaffRole } from "@prisma/client";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  nameAfrikaans: z.string().max(50).optional(),
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

  const tag = tags.find((t: Tag) => t.id === tagId);

  // Permission check using centralized permissions
  const userRole = session?.user?.staffRole as StaffRole | null;
  const canEdit = hasTagPermission(userRole, 'update');
  const canDelete = hasTagPermission(userRole, 'delete');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(tagSchema),
  });

  useEffect(() => {
    if (tag) {
      reset({
        name: tag.name,
        nameAfrikaans: tag.nameAfrikaans || '',
      });
    }
  }, [tag, reset]);

  const onSubmit: SubmitHandler<TagFormData> = async (formData) => {
    if (!canEdit) return;
    try {
      await updateTag.mutateAsync({
        id: tagId,
        data: {
          name: formData.name,
          nameAfrikaans: formData.nameAfrikaans || undefined,
        }
      });
      toast.success("Tag updated successfully!");
      router.push("/newsroom/tags");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update tag");
      } else {
        toast.error("Failed to update tag");
      }
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setShowDeleteModal(false);
    try {
      await deleteTag.mutateAsync(tagId);
      toast.success("Tag deleted successfully!");
      router.push("/newsroom/tags");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to delete tag");
      } else {
        toast.error("Failed to delete tag");
      }
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
          <Button onClick={() => router.push("/newsroom/tags")} className="mt-4">
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
            onClick: () => router.push("/newsroom/tags"),
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
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter tag name..."
                    disabled={!canEdit}
                  />
                  {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
                </Field>
                <Field>
                  <Label htmlFor="nameAfrikaans">Name (Afrikaans)</Label>
                  <Input
                    id="nameAfrikaans"
                    {...register("nameAfrikaans")}
                    placeholder="Enter Afrikaans tag name..."
                    disabled={!canEdit}
                  />
                  {errors.nameAfrikaans && <ErrorMessage>{errors.nameAfrikaans.message}</ErrorMessage>}
                </Field>
              </FieldGroup>
            </Fieldset>
          </Card>
          <Divider />
          <div className="flex justify-between items-center space-x-4">
            <div>
              {canDelete && (
                <Button type="button" color="red" onClick={() => setShowDeleteModal(true)} disabled={deleteTag.isPending} className="font-bold flex items-center gap-2">
                  <TrashIcon className="h-5 w-5" />
                  {deleteTag.isPending ? "Deleting..." : "Delete Tag"}
                </Button>
              )}
            </div>
            <div className="flex space-x-4">
              <Button
                type="button"
                color="white"
                onClick={() => router.push("/newsroom/tags")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit || updateTag.isPending}>
                {updateTag.isPending ? "Saving..." : "Save Changes"}
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
            <Button color="red" onClick={handleDelete} disabled={deleteTag.isPending} className="font-bold flex items-center gap-2">
              <TrashIcon className="h-5 w-5" />
              {deleteTag.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Container>
  );
}
