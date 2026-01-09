import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';

interface RevisionNote {
  id: string;
  content: string;
  category?: string;
}

interface RevisionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (revisionNotes: RevisionNote[]) => void;
  storyTitle: string;
  storyStatus?: string;
  isLoading?: boolean;
}

export function RevisionRequestModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  storyStatus,
  isLoading = false,
}: RevisionRequestModalProps) {
  const { data: session } = useSession();
  const [revisionNotes, setRevisionNotes] = useState<RevisionNote[]>([
    { id: '1', content: '', category: '' }
  ]);
  const [errors, setErrors] = useState<{ general?: string; notes?: Record<string, string> }>({});

  const addRevisionNote = () => {
    const newNote: RevisionNote = {
      id: Date.now().toString(),
      content: '',
      category: ''
    };
    setRevisionNotes([...revisionNotes, newNote]);
  };

  const removeRevisionNote = (id: string) => {
    if (revisionNotes.length > 1) {
      setRevisionNotes(revisionNotes.filter(note => note.id !== id));
      // Clear any errors for the removed note
      if (errors.notes) {
        const newNoteErrors = { ...errors.notes };
        delete newNoteErrors[id];
        setErrors({ ...errors, notes: newNoteErrors });
      }
    }
  };

  const updateRevisionNote = (id: string, field: keyof RevisionNote, value: string) => {
    setRevisionNotes(revisionNotes.map(note => 
      note.id === id ? { ...note, [field]: value } : note
    ));
    
    // Clear error for this field when user starts typing
    if (errors.notes?.[id]) {
      const newNoteErrors = { ...errors.notes };
      delete newNoteErrors[id];
      setErrors({ ...errors, notes: newNoteErrors });
    }
  };

  const handleConfirm = () => {
    // Validate notes
    const noteErrors: Record<string, string> = {};
    let hasErrors = false;

    revisionNotes.forEach(note => {
      if (!note.content.trim()) {
        noteErrors[note.id] = 'Revision note content is required';
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors({ notes: noteErrors });
      return;
    }

    // Filter out empty notes and format for submission
    const validNotes = revisionNotes
      .filter(note => note.content.trim())
      .map(note => ({
        ...note,
        content: note.content.trim(),
        category: note.category?.trim() || undefined
      }));

    if (validNotes.length === 0) {
      setErrors({ general: 'At least one revision note is required' });
      return;
    }

    setErrors({});
    onConfirm(validNotes);
  };

  const handleClose = () => {
    setRevisionNotes([{ id: '1', content: '', category: '' }]);
    setErrors({});
    onClose();
  };

  // Get role-based revision categories
  const getPredefinedCategories = () => {
    const userRole = session?.user?.staffRole;
    
    const baseCategories = [
      'Language & Grammar',
      'Tone & Style', 
      'Fact Checking',
      'Audio Quality',
      'Content Structure',
      'Sources & Attribution',
      'Headlines & Titles',
      'Other'
    ];
    
    // Only sub-editors and above can request revisions about category/tag assignment
    if (userRole === 'SUB_EDITOR' || userRole === 'EDITOR' || userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
      return [
        ...baseCategories.slice(0, -1), // Insert before 'Other'
        'Category Assignment',
        'Tags Assignment',
        'Other'
      ];
    }
    
    // Journalists reviewing intern stories shouldn't see category/tag assignment options
    return baseCategories;
  };
  
  const predefinedCategories = getPredefinedCategories();

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          <div className="p-6 flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <Dialog.Title as={Heading} level={3}>
                Request Revision
              </Dialog.Title>
              <Button
                type="button"
                color="white"
                onClick={handleClose}
                disabled={isLoading}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content - Scrollable */}
            <div
              className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]"
              style={{ scrollbarWidth: 'thin' }}
            >
              <Text className="text-zinc-600">
                Please provide detailed notes about what needs to be revised in this story:
              </Text>
              
              <div className="bg-zinc-50 p-3 rounded-lg">
                <Text className="font-medium text-zinc-900">&ldquo;{storyTitle}&rdquo;</Text>
              </div>

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <Text className="text-red-800 text-sm">{errors.general}</Text>
                </div>
              )}

              {/* Revision Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text className="text-base font-semibold">Revision Notes</Text>
                  <Button
                    type="button"
                    color="white"
                    onClick={addRevisionNote}
                    disabled={isLoading}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>

                {revisionNotes.map((note, index) => (
                  <div key={note.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Text className="text-sm font-medium text-zinc-700">
                        Note #{index + 1}
                      </Text>
                      {revisionNotes.length > 1 && (
                        <Button
                          type="button"
                          color="white"
                          onClick={() => removeRevisionNote(note.id)}
                          disabled={isLoading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Fieldset>
                      <FieldGroup>
                        <Field>
                          <Label htmlFor={`category-${note.id}`}>Category (Optional)</Label>
                          <div className="flex space-x-2">
                            <Input
                              id={`category-${note.id}`}
                              value={note.category || ''}
                              onChange={(e) => updateRevisionNote(note.id, 'category', e.target.value)}
                              placeholder="e.g., Grammar, Content, Structure..."
                              disabled={isLoading}
                              list={`categories-${note.id}`}
                            />
                            <datalist id={`categories-${note.id}`}>
                              {predefinedCategories.map(category => (
                                <option key={category} value={category} />
                              ))}
                            </datalist>
                          </div>
                        </Field>

                        <Field>
                          <Label htmlFor={`content-${note.id}`}>
                            Revision Details * 
                            {note.category && (
                              <span className="text-zinc-500 font-normal"> - {note.category}</span>
                            )}
                          </Label>
                          <Textarea
                            id={`content-${note.id}`}
                            value={note.content}
                            onChange={(e) => updateRevisionNote(note.id, 'content', e.target.value)}
                            placeholder="Describe what needs to be changed, added, or improved..."
                            rows={3}
                            disabled={isLoading}
                          />
                          {errors.notes?.[note.id] && (
                            <ErrorMessage>{errors.notes[note.id]}</ErrorMessage>
                          )}
                        </Field>
                      </FieldGroup>
                    </Fieldset>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-sm text-blue-800">
                  <strong>Note:</strong> This story will be sent back to {
                    storyStatus === 'PENDING_APPROVAL' 
                      ? 'the journalist' 
                      : 'the author'
                  } for revision. 
                  Each revision note will be tracked separately and can be marked as resolved individually.
                </Text>
              </div>
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-zinc-200 flex-shrink-0">
              <Button
                type="button"
                color="white"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Requesting Revision...' : `Request Revision (${revisionNotes.filter(n => n.content.trim()).length} notes)`}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 