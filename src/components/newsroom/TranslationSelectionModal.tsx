import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Translator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  translationLanguage?: 'AFRIKAANS' | 'XHOSA';
}

interface TranslationRequest {
  language: string;
  translatorId: string;
}

interface TranslationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (translations: TranslationRequest[]) => void;
  storyTitle: string;
  isLoading?: boolean;
}

export function TranslationSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  isLoading = false,
}: TranslationSelectionModalProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set(['AFRIKAANS']));
  const [afrikaansTranslators, setAfrikaansTranslators] = useState<Translator[]>([]);
  const [xhosaTranslators, setXhosaTranslators] = useState<Translator[]>([]);
  const [selectedAfrikaansTranslator, setSelectedAfrikaansTranslator] = useState('');
  const [selectedXhosaTranslator, setSelectedXhosaTranslator] = useState('');
  const [isLoadingTranslators, setIsLoadingTranslators] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTranslators();
    } else {
      // Reset state when modal closes
      setSelectedLanguages(new Set(['AFRIKAANS']));
      setAfrikaansTranslators([]);
      setXhosaTranslators([]);
      setSelectedAfrikaansTranslator('');
      setSelectedXhosaTranslator('');
    }
  }, [isOpen]);

  const fetchTranslators = async () => {
    setIsLoadingTranslators(true);
    try {
      // Fetch Afrikaans translators
      const afrikaansResponse = await fetch(`/api/users?userType=STAFF&isActive=true&translationLanguage=AFRIKAANS&perPage=100`);
      if (afrikaansResponse.ok) {
        const afrikaansData = await afrikaansResponse.json();
        const afrikaansUsers = afrikaansData.users || [];
        setAfrikaansTranslators(afrikaansUsers);
        if (afrikaansUsers.length > 0) {
          setSelectedAfrikaansTranslator(afrikaansUsers[0].id);
        }
      }

      // Fetch Xhosa translators
      const xhosaResponse = await fetch(`/api/users?userType=STAFF&isActive=true&translationLanguage=XHOSA&perPage=100`);
      if (xhosaResponse.ok) {
        const xhosaData = await xhosaResponse.json();
        const xhosaUsers = xhosaData.users || [];
        setXhosaTranslators(xhosaUsers);
        if (xhosaUsers.length > 0) {
          setSelectedXhosaTranslator(xhosaUsers[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching translators:', error);
    } finally {
      setIsLoadingTranslators(false);
    }
  };

  const handleLanguageToggle = (language: string, checked: boolean) => {
    const newSelectedLanguages = new Set(selectedLanguages);
    if (checked) {
      newSelectedLanguages.add(language);
    } else {
      // Don't allow unchecking Afrikaans as it's required
      if (language !== 'AFRIKAANS') {
        newSelectedLanguages.delete(language);
      }
    }
    setSelectedLanguages(newSelectedLanguages);
  };

  const handleConfirm = () => {
    const translations: TranslationRequest[] = [];
    
    // Always include Afrikaans (required)
    if (selectedAfrikaansTranslator) {
      translations.push({
        language: 'AFRIKAANS',
        translatorId: selectedAfrikaansTranslator
      });
    }

    // Include Xhosa if selected
    if (selectedLanguages.has('XHOSA') && selectedXhosaTranslator) {
      translations.push({
        language: 'XHOSA',
        translatorId: selectedXhosaTranslator
      });
    }

    if (translations.length > 0) {
      onConfirm(translations);
    }
  };

  const isFormValid = selectedAfrikaansTranslator && (!selectedLanguages.has('XHOSA') || selectedXhosaTranslator);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title as={Heading} level={3}>
                Send for Translation
              </Dialog.Title>
              <Button
                type="button"
                color="white"
                onClick={onClose}
                disabled={isLoading}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <Text className="text-gray-600">
                Select target languages and translators for this story:
              </Text>
              <div className="bg-gray-50 p-3 rounded-lg">
                <Text className="font-medium text-gray-900">&ldquo;{storyTitle}&rdquo;</Text>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Target Languages
                </label>
                <div className="space-y-2">
                  {/* Afrikaans (Required) */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={true}
                      disabled={true}
                      onChange={() => {}} // No-op since it's required
                    />
                    <Text className="text-sm font-medium">Afrikaans (Required)</Text>
                  </div>
                  
                  {/* Xhosa (Optional) */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedLanguages.has('XHOSA')}
                      onChange={(checked) => handleLanguageToggle('XHOSA', checked)}
                      disabled={isLoading}
                    />
                    <Text className="text-sm">Xhosa (Optional)</Text>
                  </div>
                </div>
              </div>

              {isLoadingTranslators ? (
                <div className="text-center py-4">
                  <Text className="text-gray-500">Loading translators...</Text>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Afrikaans Translator Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Afrikaans Translator *
                    </label>
                    {afrikaansTranslators.length === 0 ? (
                      <div className="text-center py-2">
                        <Text className="text-red-600 text-sm">No Afrikaans translators available</Text>
                      </div>
                    ) : (
                      <Select
                        value={selectedAfrikaansTranslator}
                        onChange={e => setSelectedAfrikaansTranslator(e.target.value)}
                        disabled={isLoading}
                      >
                        <option value="">Choose an Afrikaans translator...</option>
                        {afrikaansTranslators.map(translator => (
                          <option key={translator.id} value={translator.id}>
                            {translator.firstName} {translator.lastName}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>

                  {/* Xhosa Translator Selection */}
                  {selectedLanguages.has('XHOSA') && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Xhosa Translator *
                      </label>
                      {xhosaTranslators.length === 0 ? (
                        <div className="text-center py-2">
                          <Text className="text-red-600 text-sm">No Xhosa translators available</Text>
                        </div>
                      ) : (
                        <Select
                          value={selectedXhosaTranslator}
                          onChange={e => setSelectedXhosaTranslator(e.target.value)}
                          disabled={isLoading}
                        >
                          <option value="">Choose a Xhosa translator...</option>
                          {xhosaTranslators.map(translator => (
                            <option key={translator.id} value={translator.id}>
                              {translator.firstName} {translator.lastName}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                color="white"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isFormValid || isLoading || isLoadingTranslators}
              >
                {isLoading ? 'Sending...' : 'Send for Translation'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 