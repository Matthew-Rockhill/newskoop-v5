'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/solid';
import { AudioClip as PrismaAudioClip } from '@prisma/client';

type AudioClip = Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration' | 'mimeType'>;

// Type for local File objects (before upload)
interface LocalAudioFile {
  id: string;
  file: File;
  name: string;
}

interface CustomAudioPlayerProps {
  clip?: AudioClip; // From database
  localFile?: LocalAudioFile; // Local file before upload
  onPlay?: (audioId: string) => void;
  onStop?: (audioId: string) => void;
  onRestart?: (audioId: string) => void;
  onSeek?: (audioId: string, time: number) => void;
  onTimeUpdate?: (audioId: string, currentTime: number) => void;
  onLoadedMetadata?: (audioId: string, duration: number) => void;
  onEnded?: (audioId: string) => void;
  onError?: (audioId: string) => void;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  compact?: boolean;
}

export function CustomAudioPlayer({
  clip,
  localFile,
  onPlay,
  onEnded,
  onError,
}: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Generate object URL for local files
  useEffect(() => {
    if (localFile?.file) {
      const url = URL.createObjectURL(localFile.file);
      setObjectUrl(url);

      // Cleanup on unmount
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [localFile]);

  // Determine audio source and display name
  const audioUrl = clip?.url || objectUrl || '';
  const displayName = clip?.originalName || localFile?.name || 'Audio File';
  const audioId = clip?.id || localFile?.id || 'unknown';

  // Reload audio when source changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [audioUrl, clip?.mimeType]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      onPlay?.(audioId);
    }
  }, [isPlaying, onPlay, audioId]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || isDragging) return;
    setCurrentTime(audioRef.current.currentTime);
  }, [isDragging]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    onEnded?.(audioId);
  }, [onEnded, audioId]);

  const handleError = useCallback(() => {
    setIsPlaying(false);
    onError?.(audioId);
  }, [onError, audioId]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const handleSeekStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Sync audio element with external playing state
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handleError]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Don't render if no audio source
  if (!audioUrl) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata">
        <source src={audioUrl} type={clip?.mimeType || localFile?.file.type || 'audio/mpeg'} />
        Your browser does not support the audio element.
      </audio>

      {/* Audio Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <MusicalNoteIcon className="h-5 w-5 text-kelly-green" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatTime(duration)}
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-16 h-16 rounded-full bg-kelly-green hover:bg-green-600 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-kelly-green/30"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseIcon className="h-8 w-8" />
          ) : (
            <PlayIcon className="h-8 w-8 ml-1" />
          )}
        </button>

        {/* Progress Section */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden group">
            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-kelly-green transition-all"
              style={{ width: `${progress}%` }}
            />

            {/* Seek Input */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration - currentTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
