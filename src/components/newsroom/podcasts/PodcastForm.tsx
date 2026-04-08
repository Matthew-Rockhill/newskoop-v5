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
import { useClassifications } from '@/hooks/use-classifications';
import { ClassificationType } from '@prisma/client';
import { Podcast, CreatePodcastData, UpdatePodcastData } from '@/hooks/use-podcasts';

const podcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classificationIds: z.array(z.string()).optional(),
  isPublished: z.boolean(),
});

type PodcastFormData = z.infer<typeof podcastSchema>;

interface PodcastFormProps {
  podcast?: Podcast;
  onSubmit: (data: CreatePodcastData | UpdatePodcastData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PodcastForm({ podcast, onSubmit, onCancel, isSubmitting = false }: PodcastFormProps) {
  const { data: classificationsData } = useClassifications(ClassificationType.LANGUAGE);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PodcastFormData>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: podcast?.title ?? '',
      description: podcast?.description ?? '',
      classificationIds: podcast?.classifications?.map(c => c.classification.id) ?? [],
      isPublished: podcast?.isPublished ?? false,
    },
  });

  const selectedClassificationIds = watch('classificationIds') ?? [];
  const isPublished = watch('isPublished');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Title *</Label>
            <Input {...register('title')} placeholder="Enter podcast title" />
            <Description>Slug will be automatically generated from the title</Description>
            <ErrorMessage>{errors.title?.message}</ErrorMessage>
          </Field>

          <Field>
            <Label>Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Brief description of the podcast"
              rows={3}
            />
            <ErrorMessage>{errors.description?.message}</ErrorMessage>
          </Field>

          <Field>
            <Label>Languages</Label>
            <Description>
              Select the language(s) in which this podcast's content will be available.
              At least one language is required for the podcast to appear on radio stations.
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
            <Label>Publish podcast</Label>
            <Description>Published podcasts are visible to radio stations</Description>
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
          {isSubmitting ? 'Saving...' : podcast ? 'Update Podcast' : 'Create Podcast'}
        </Button>
      </div>
    </form>
  );
}
