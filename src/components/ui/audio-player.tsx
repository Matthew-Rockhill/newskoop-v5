'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/solid';
import { AudioClip as PrismaAudioClip } from '@prisma/client';
import { formatDuration } from '@/lib/format-utils';

type AudioClip = Pick<PrismaAudioClip, 'id' | 'url' | 'originalName' | 'duration' | 'mimeType'>;

// Type for local File objects (before upload)
interface LocalAudioFile {
  id: string;
  file: File;
  name: string;
}

// Module-level coordinator: when any player starts, others auto-pause
const audioCoordinator = typeof window !== 'undefined' ? new EventTarget() : null;

interface CustomAudioPlayerProps {
  clip?: AudioClip; // From database
  localFile?: LocalAudioFile; // Local file before upload
  onPlay?: (audioId: string) => void;
  onEnded?: (audioId: string) => void;
  onError?: (audioId: string) => void;
  compact?: boolean;
  autoPlay?: boolean;
}

export function CustomAudioPlayer({
  clip,
  localFile,
  onPlay,
  onEnded,
  onError,
  compact = false,
  autoPlay = false,
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
  }, [localFile?.file]);

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

  // Listen for coordination events — pause when another player starts
  useEffect(() => {
    if (!audioCoordinator) return;

    const handleOtherPlay = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail !== audioId && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    audioCoordinator.addEventListener('audio-play', handleOtherPlay);
    return () => {
      audioCoordinator.removeEventListener('audio-play', handleOtherPlay);
    };
  }, [audioId]);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Notify other players to stop
        audioCoordinator?.dispatchEvent(
          new CustomEvent('audio-play', { detail: audioId })
        );
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.(audioId);
      }
    } catch {
      // Handle the play() interruption gracefully (AbortError)
      // Other errors are handled by the error event listener
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

  // Auto-play when prop is set (e.g. playlist auto-advance)
  useEffect(() => {
    if (autoPlay && audioRef.current && audioUrl) {
      const startPlayback = async () => {
        try {
          audioCoordinator?.dispatchEvent(
            new CustomEvent('audio-play', { detail: audioId })
          );
          await audioRef.current!.play();
          setIsPlaying(true);
          onPlay?.(audioId);
        } catch {
          // Browser may block autoplay
        }
      };
      startPlayback();
    }
  }, [autoPlay, audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync audio element with internal state
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

  // Show error state if no audio source
  if (!audioUrl) {
    return (
      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">
          Audio file unavailable: {displayName}
        </p>
      </div>
    );
  }

  // Compact version - title above, controls below
  if (compact) {
    return (
      <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        {/* Hidden audio element */}
        <audio ref={audioRef} preload="metadata">
          <source src={audioUrl} type={clip?.mimeType || localFile?.file.type || 'audio/mpeg'} />
          Your browser does not support the audio element.
        </audio>

        {/* File name - above controls */}
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 truncate" title={displayName}>
          {displayName}
        </p>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button - Smaller */}
          <button
            onClick={handlePlayPause}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-kelly-green hover:bg-green-600 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelly-green/50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4 ml-0.5" />
            )}
          </button>

          {/* Progress Bar - Inline */}
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 h-1.5 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-kelly-green has-[:focus-visible]:ring-offset-2">
              <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-kelly-green transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
                onKeyDown={handleSeekStart}
                onKeyUp={handleSeekEnd}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>
          </div>

          {/* Time - Compact */}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-10 text-right">
            {formatDuration(currentTime)}
          </span>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
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
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
          </div>
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-16 h-16 rounded-full bg-kelly-green hover:bg-green-600 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-kelly-green/50"
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
          <div className="relative h-2 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-kelly-green has-[:focus-visible]:ring-offset-2">
            {/* Progress Fill */}
            <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-kelly-green transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

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
              onKeyDown={handleSeekStart}
              onKeyUp={handleSeekEnd}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration - currentTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
