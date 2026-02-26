'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Switch, SwitchField } from '@/components/ui/switch';
import { MultiCombobox, MultiComboboxOption, MultiComboboxLabel } from '@/components/ui/multi-combobox';
import { Select } from '@/components/ui/select';
import { useClassifications } from '@/hooks/use-classifications';
import { ClassificationType } from '@prisma/client';
import { Show, CreateShowData, UpdateShowData, useParentShows } from '@/hooks/use-shows';

// Schema for form validation - defaults are handled by useForm's defaultValues
const showSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classificationIds: z.array(z.string()).optional(),
  isPublished: z.boolean(),
  parentId: z.string().nullable().optional(),
});

type ShowFormData = z.infer<typeof showSchema>;

interface ShowFormProps {
  show?: Show;
  defaultParentId?: string | null;
  onSubmit: (data: CreateShowData | UpdateShowData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ShowForm({ show, defaultParentId, onSubmit, onCancel, isSubmitting = false }: ShowFormProps) {
  const { data: classificationsData } = useClassifications(ClassificationType.LANGUAGE);
  const { data: parentShows } = useParentShows();

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
      classificationIds: show?.classifications?.map(c => c.classification.id) ?? [],
      isPublished: show?.isPublished ?? false,
      parentId: show?.parentId ?? defaultParentId ?? null,
    },
  });

  const selectedClassificationIds = watch('classificationIds') ?? [];
  const isPublished = watch('isPublished');
  const selectedParentId = watch('parentId');

  // Filter parent show options: exclude current show and any show that already has a parentId
  const parentShowOptions = (parentShows ?? []).filter(
    (s) => s.id !== show?.id && !s.parentId
  );

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
            <Label>Parent Show</Label>
            <Description>
              Optionally nest this show under a parent show. Leave empty for a top-level show.
            </Description>
            <Select
              value={selectedParentId ?? ''}
              onChange={(e) => setValue('parentId', e.target.value || null)}
            >
              <option value="">None (top-level show)</option>
              {parentShowOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Languages</Label>
            <Description>
              Select the language(s) in which this show's content will be available.
              At least one language is required for the show to appear on radio stations.
            </Description>
            <MultiCombobox
              options={classificationsData?.classifications ?? []}
              value={selectedClassificationIds}
              onChange={(ids) => setValue('classificationIds', ids)}
              displayValue={(classification) => classification?.name}
              placeholder="Search languages..."
              aria-label="Languages"
            >
              {(classification) => (
                <MultiComboboxOption value={classification.id}>
                  <MultiComboboxLabel>{classification.name}</MultiComboboxLabel>
                </MultiComboboxOption>
              )}
            </MultiCombobox>
            <ErrorMessage>{errors.classificationIds?.message}</ErrorMessage>
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
