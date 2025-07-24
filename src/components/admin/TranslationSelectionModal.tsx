import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Select } from '@/components/ui/select';

interface Translator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  translationLanguage?: 'AFRIKAANS' | 'XHOSA';
}

interface TranslationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { language: string; translatorId: string }) => void;
  storyTitle: string;
  isLoading?: boolean;
}

const LANGUAGES = [
  { value: 'AFRIKAANS', label: 'Afrikaans' },
  { value: 'XHOSA', label: 'Xhosa' },
];

export function TranslationSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  storyTitle,
  isLoading = false,
}: TranslationSelectionModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translators, setTranslators] = useState<Translator[]>([]);
  const [selectedTranslatorId, setSelectedTranslatorId] = useState('');
  const [isLoadingTranslators, setIsLoadingTranslators] = useState(false);

  useEffect(() => {
    if (isOpen && selectedLanguage) {
      fetchTranslators(selectedLanguage);
    } else {
      setTranslators([]);
      setSelectedTranslatorId('');
    }
  }, [isOpen, selectedLanguage]);

  const fetchTranslators = async (language: string) => {
    setIsLoadingTranslators(true);
    try {
      const response = await fetch(`/api/users?userType=STAFF&isActive=true&translationLanguage=${language}&perPage=100`);
      if (!response.ok) {
        throw new Error('Failed to fetch translators');
      }
      const data = await response.json();
      const users = data.users || [];
      setTranslators(users);
      if (users.length > 0) {
        setSelectedTranslatorId(users[0].id);
      } else {
        setSelectedTranslatorId('');
      }
    } catch (error) {
      console.error('Error fetching translators:', error);
    } finally {
      setIsLoadingTranslators(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLanguage && selectedTranslatorId) {
      onConfirm({ language: selectedLanguage, translatorId: selectedTranslatorId });
    }
  };

  const selectedTranslator = translators.find(t => t.id === selectedTranslatorId);

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
                Select the target language and translator for this story:
              </Text>
              <div className="bg-gray-50 p-3 rounded-lg">
                <Text className="font-medium text-gray-900">"{storyTitle}"</Text>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Target Language *
                </label>
                <Select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Choose a language...</option>
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </Select>
              </div>

              {selectedLanguage && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Translator *
                  </label>
                  {isLoadingTranslators ? (
                    <div className="text-center py-4">
                      <Text className="text-gray-500">Loading translators...</Text>
                    </div>
                  ) : translators.length === 0 ? (
                    <div className="text-center py-4">
                      <Text className="text-red-600">No translators available for this language</Text>
                    </div>
                  ) : (
                    <Select
                      value={selectedTranslatorId}
                      onChange={e => setSelectedTranslatorId(e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="">Choose a translator...</option>
                      {translators.map(translator => (
                        <option key={translator.id} value={translator.id}>
                          {translator.firstName} {translator.lastName} ({translator.email})
                        </option>
                      ))}
                    </Select>
                  )}
                  {selectedTranslator && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Text className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedTranslator.firstName} {selectedTranslator.lastName}
                      </Text>
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
                disabled={!selectedLanguage || !selectedTranslatorId || isLoading || isLoadingTranslators}
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