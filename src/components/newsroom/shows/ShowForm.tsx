'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Switch, SwitchField } from '@/components/ui/switch';
import { MultiCombobox, MultiComboboxOption, MultiComboboxLabel } from '@/components/ui/multi-combobox';
import { useTags } from '@/hooks/use-tags';
import { Show, CreateShowData, UpdateShowData } from '@/hooks/use-shows';

// Schema for form validation - defaults are handled by useForm's defaultValues
const showSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  isPublished: z.boolean(),
});

type ShowFormData = z.infer<typeof showSchema>;

interface ShowFormProps {
  show?: Show;
  onSubmit: (data: CreateShowData | UpdateShowData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ShowForm({ show, onSubmit, onCancel, isSubmitting = false }: ShowFormProps) {
  const { data: tagsData } = useTags(undefined, 'LANGUAGE');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShowFormData>({
    resolver: zodResolver(showSchema),
    defaultValues: {
      title: show?.title ?? '',
      description: show?.description ?? '',
      tagIds: show?.tags?.map(t => t.tag.id) ?? [],
      isPublished: show?.isPublished ?? false,
    },
  });

  const selectedTagIds = watch('tagIds') ?? [];
  const isPublished = watch('isPublished');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Title *</Label>
            <Input {...register('title')} placeholder="Enter show title" />
            <Description>Slug will be automatically generated from the title</Description>
            <ErrorMessage>{errors.title?.message}</ErrorMessage>
          </Field>

          <Field>
            <Label>Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Brief description of the show"
              rows={3}
            />
            <ErrorMessage>{errors.description?.message}</ErrorMessage>
          </Field>

          <Field>
            <Label>Language Tags</Label>
            <Description>
              Select the language(s) in which this show's content will be available.
              At least one language is required for the show to appear on radio stations.
            </Description>
            <MultiCombobox
              options={tagsData?.tags ?? []}
              value={selectedTagIds}
              onChange={(tagIds) => setValue('tagIds', tagIds)}
              displayValue={(tag) => tag?.name}
              placeholder="Search languages..."
              aria-label="Language Tags"
            >
              {(tag) => (
                <MultiComboboxOption value={tag.id}>
                  <MultiComboboxLabel>{tag.name}</MultiComboboxLabel>
                </MultiComboboxOption>
              )}
            </MultiCombobox>
            <ErrorMessage>{errors.tagIds?.message}</ErrorMessage>
          </Field>

          <SwitchField>
            <Label>Publish show</Label>
            <Description>Published shows are visible to radio stations</Description>
            <Switch
              checked={isPublished}
              onChange={(checked) => setValue('isPublished', checked)}
              color="green"
            />
          </SwitchField>
        </FieldGroup>
      </Fieldset>

      <div className="flex justify-end gap-3">
        <Button type="button" color="white" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : show ? 'Update Show' : 'Create Show'}
        </Button>
      </div>
    </form>
  );
}
