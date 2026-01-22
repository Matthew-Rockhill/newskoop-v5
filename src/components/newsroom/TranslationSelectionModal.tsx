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
  translationLanguage?: 'AFRIKAANS' | 'XHOSA' | 'ZULU';
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
  const [zuluTranslators, setZuluTranslators] = useState<Translator[]>([]);
  const [selectedAfrikaansTranslator, setSelectedAfrikaansTranslator] = useState('');
  const [selectedXhosaTranslator, setSelectedXhosaTranslator] = useState('');
  const [selectedZuluTranslator, setSelectedZuluTranslator] = useState('');
  const [isLoadingTranslators, setIsLoadingTranslators] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTranslators();
    } else {
      // Reset state when modal closes
      setSelectedLanguages(new Set(['AFRIKAANS']));
      setAfrikaansTranslators([]);
      setXhosaTranslators([]);
      setZuluTranslators([]);
      setSelectedAfrikaansTranslator('');
      setSelectedXhosaTranslator('');
      setSelectedZuluTranslator('');
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

      // Fetch Zulu translators
      const zuluResponse = await fetch(`/api/users?userType=STAFF&isActive=true&translationLanguage=ZULU&perPage=100`);
      if (zuluResponse.ok) {
        const zuluData = await zuluResponse.json();
        const zuluUsers = zuluData.users || [];
        setZuluTranslators(zuluUsers);
        if (zuluUsers.length > 0) {
          setSelectedZuluTranslator(zuluUsers[0].id);
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

    // Include Zulu if selected
    if (selectedLanguages.has('ZULU') && selectedZuluTranslator) {
      translations.push({
        language: 'ZULU',
        translatorId: selectedZuluTranslator
      });
    }

    if (translations.length > 0) {
      onConfirm(translations);
    }
  };

  const isFormValid = selectedAfrikaansTranslator &&
    (!selectedLanguages.has('XHOSA') || selectedXhosaTranslator) &&
    (!selectedLanguages.has('ZULU') || selectedZuluTranslator);

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
                Create Translation
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
              <Text className="text-zinc-600">
                Create translation copies of this story in the selected languages:
              </Text>
              <div className="bg-zinc-50 p-3 rounded-lg">
                <Text className="font-medium text-zinc-900">&ldquo;{storyTitle}&rdquo;</Text>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-700">
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

                  {/* Zulu (Optional) */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedLanguages.has('ZULU')}
                      onChange={(checked) => handleLanguageToggle('ZULU', checked)}
                      disabled={isLoading}
                    />
                    <Text className="text-sm">Zulu (Optional)</Text>
                  </div>
                </div>
              </div>

              {isLoadingTranslators ? (
                <div className="text-center py-4">
                  <Text className="text-zinc-500">Loading translators...</Text>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Afrikaans Translator Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-700">
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
                      <label className="block text-sm font-medium text-zinc-700">
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

                  {/* Zulu Translator Selection */}
                  {selectedLanguages.has('ZULU') && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-zinc-700">
                        Zulu Translator *
                      </label>
                      {zuluTranslators.length === 0 ? (
                        <div className="text-center py-2">
                          <Text className="text-red-600 text-sm">No Zulu translators available</Text>
                        </div>
                      ) : (
                        <Select
                          value={selectedZuluTranslator}
                          onChange={e => setSelectedZuluTranslator(e.target.value)}
                          disabled={isLoading}
                        >
                          <option value="">Choose a Zulu translator...</option>
                          {zuluTranslators.map(translator => (
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
                {isLoading ? 'Creating...' : 'Create Translation'}
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 