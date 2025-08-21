'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LanguageIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LanguageToggleProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  availableLanguages: string[];
}

const LANGUAGE_CODES = {
  'English': 'EN',
  'Afrikaans': 'AF', 
  'Xhosa': 'XH',
} as const;

export function LanguageToggle({
  selectedLanguage,
  onLanguageChange,
  availableLanguages = ['English']
}: LanguageToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredLanguages = availableLanguages.filter(lang => 
    Object.keys(LANGUAGE_CODES).includes(lang)
  );

  if (filteredLanguages.length <= 1) {
    return null; // Don't show if only one language available
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-6 py-3 rounded-full border-2 font-medium transition-all",
          "bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-kelly-green focus:ring-offset-2",
          isOpen ? "border-kelly-green text-kelly-green" : "border-gray-200 text-gray-700"
        )}
      >
        <LanguageIcon className="h-5 w-5" />
        <span className="font-mono font-bold tracking-wider">
          {LANGUAGE_CODES[selectedLanguage as keyof typeof LANGUAGE_CODES] || 'EN'}
        </span>
        <span className="text-sm font-normal hidden sm:inline">
          {selectedLanguage}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20 min-w-[200px]"
          >
            <div className="py-2">
              {filteredLanguages.map((language) => {
                const code = LANGUAGE_CODES[language as keyof typeof LANGUAGE_CODES];
                const isSelected = language === selectedLanguage;
                
                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => {
                      onLanguageChange(language);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                      isSelected 
                        ? "bg-kelly-green text-white" 
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="font-mono font-bold text-sm min-w-[24px]">
                      {code}
                    </span>
                    <span className="font-medium">
                      {language}
                    </span>
                    {isSelected && (
                      <svg className="h-4 w-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}