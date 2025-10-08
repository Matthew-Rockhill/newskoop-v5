'use client';

import { useCallback, useState } from 'react';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import { CustomAudioPlayer } from './audio-player';
import clsx from 'clsx';

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
}

interface FileUploadProps {
  onFilesChange: (files: AudioFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxFileSize = 50, // 50MB default
  acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    console.log('📁 FileUpload: handleFiles called with', newFiles.length, 'files');
    setError(null);

    // Validate files
    const validFiles: AudioFile[] = [];

    for (const file of newFiles) {
      console.log('📁 Processing file:', file.name, 'type:', file.type, 'size:', file.size);

      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        console.error('❌ Invalid file type:', file.type, 'Expected:', acceptedTypes);
        setError(`Invalid file type: ${file.name}. Please upload audio files only.`);
        continue;
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        setError(`File too large: ${file.name}. Maximum size is ${maxFileSize}MB.`);
        continue;
      }

      // Check total files limit
      if (files.length + validFiles.length >= maxFiles) {
        console.error('❌ Max files reached');
        setError(`Maximum ${maxFiles} files allowed.`);
        break;
      }

      console.log('✅ File validated:', file.name);
      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
      });
    }

    console.log('📁 Valid files:', validFiles.length);
    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      console.log('📁 Updating state with', updatedFiles.length, 'total files');
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  }, [acceptedTypes, files, maxFileSize, maxFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver
            ? 'border-[#76BD43] bg-[#76BD43]/5'
            : 'border-gray-300 hover:border-gray-400'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-[#76BD43] hover:text-[#5fa013]">
                Click to upload audio files
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept={acceptedTypes.join(',')}
                onChange={handleFileInput}
              />
            </label>{' '}
            or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            MP3, WAV, OGG, MP4 up to {maxFileSize}MB each (max {maxFiles} files)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Files ({files.length}/{maxFiles})
          </h4>
          {files.map((audioFile) => (
            <div key={audioFile.id} className="relative">
              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(audioFile.id)}
                className="absolute top-2 right-2 z-10 p-1 bg-white dark:bg-gray-900 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 transition-colors"
                aria-label="Remove file"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              {/* Audio Player */}
              <CustomAudioPlayer
                localFile={{
                  id: audioFile.id,
                  file: audioFile.file,
                  name: audioFile.name,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 