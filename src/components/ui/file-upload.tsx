'use client';

import { useCallback, useState } from 'react';
import { CloudArrowUpIcon, XMarkIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import clsx from 'clsx';

interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
  description?: string;
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (newFiles: File[]) => {
    setError(null);
    
    // Validate files
    const validFiles: AudioFile[] = [];
    
    for (const file of newFiles) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please upload audio files only.`);
        continue;
      }
      
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is ${maxFileSize}MB.`);
        continue;
      }
      
      // Check total files limit
      if (files.length + validFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
        break;
      }
      
      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
      });
    }
    
    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

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

  const updateFileDescription = (id: string, description: string) => {
    const updatedFiles = files.map(file => 
      file.id === id ? { ...file, description } : file
    );
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Files ({files.length}/{maxFiles})
          </h4>
          {files.map((audioFile) => (
            <div
              key={audioFile.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <MusicalNoteIcon className="h-8 w-8 text-[#76BD43] flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {audioFile.name}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(audioFile.id)}
                    className="text-gray-400 hover:text-red-500 ml-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(audioFile.size)}
                </p>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Add description (optional)..."
                    value={audioFile.description || ''}
                    onChange={(e) => updateFileDescription(audioFile.id, e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#76BD43] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 